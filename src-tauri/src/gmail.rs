use anyhow::{anyhow, Context, Result};
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use chrono::Utc;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use url::Url;

pub const GMAIL_DEFAULT_CLIENT_ID: &str =
    "688447609926-eofijjrca2qvbt7e936ccu6d8c4fdrmh.apps.googleusercontent.com";

const AUTH_FILE_NAME: &str = "gmail_auth.json";
const CACHE_FILE_NAME: &str = "gmail_cache.json";
const CALENDAR_AUTH_FILE_NAME: &str = "google_calendar_auth.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailAuth {
    pub client_id: String,
    pub client_secret: Option<String>,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailLabel {
    pub id: String,
    pub name: String,
    pub label_type: String, // "system" | "user"
    pub unread_count: usize,
    pub total_count: usize,
    pub bg_color: Option<String>,
    pub text_color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailAttachment {
    pub id: String,
    pub filename: String,
    pub mime_type: String,
    pub size: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentData {
    pub size: usize,
    pub data: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailMessage {
    pub id: String,
    pub thread_id: String,
    pub from: String,
    pub from_name: Option<String>,
    pub to: Vec<String>,
    pub cc: Vec<String>,
    pub bcc: Vec<String>,
    pub date: String,
    pub timestamp: i64,
    pub subject: String,
    pub snippet: String,
    pub body_html: Option<String>,
    pub body_text: Option<String>,
    pub body_markdown: String,
    pub attachments: Vec<MailAttachment>,
    pub label_ids: Vec<String>,
    pub unread: bool,
    pub starred: bool,
    pub message_id_header: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MailThread {
    pub id: String,
    pub snippet: String,
    pub history_id: Option<String>,
    pub subject: String,
    pub from: String,
    pub from_name: Option<String>,
    pub to: Vec<String>,
    pub date: String,
    pub timestamp: i64,
    pub message_count: usize,
    pub unread: bool,
    pub starred: bool,
    pub label_ids: Vec<String>,
    pub messages: Option<Vec<MailMessage>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct MailCacheData {
    pub connected: bool,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
    pub last_synced: Option<i64>,
    pub unread_count: usize,
    pub labels: Vec<MailLabel>,
    pub threads: Vec<MailThread>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SendMailPayload {
    pub to: Vec<String>,
    pub cc: Option<Vec<String>>,
    pub bcc: Option<Vec<String>>,
    pub subject: String,
    pub body_text: String,
    pub body_html: Option<String>,
    pub in_reply_to: Option<String>,
    pub references: Option<String>,
    pub thread_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModifyThreadPayload {
    pub thread_id: String,
    pub add_label_ids: Vec<String>,
    pub remove_label_ids: Vec<String>,
}

fn uuid_like_id() -> String {
    let now = Utc::now().timestamp_nanos_opt().unwrap_or(0);
    format!("msg_{:x}", now)
}

/// Convert HTML text to clean Markdown prose
pub fn html_to_clean_markdown(html: &str) -> String {
    if html.trim().is_empty() {
        return String::new();
    }

    // 1. Remove script, style, and head tags entirely
    let re_script = Regex::new(r"(?is)<script[^>]*>.*?</script>").unwrap();
    let re_style = Regex::new(r"(?is)<style[^>]*>.*?</style>").unwrap();
    let re_head = Regex::new(r"(?is)<head[^>]*>.*?</head>").unwrap();
    let no_scripts = re_script.replace_all(html, "");
    let no_styles = re_style.replace_all(&no_scripts, "");
    let no_head = re_head.replace_all(&no_styles, "");

    // 2. Convert standard block tags to newlines
    let re_br = Regex::new(r"(?i)<br\s*/?>").unwrap();
    let s = re_br.replace_all(&no_head, "\n");

    let re_p = Regex::new(r"(?i)</?p[^>]*>").unwrap();
    let s = re_p.replace_all(&s, "\n\n");

    let re_div = Regex::new(r"(?i)</?div[^>]*>").unwrap();
    let s = re_div.replace_all(&s, "\n");

    let re_h = Regex::new(r"(?i)<h[1-6][^>]*>(.*?)</h[1-6]>").unwrap();
    let s = re_h.replace_all(&s, "\n\n### $1\n\n");

    // 3. Lists
    let re_li = Regex::new(r"(?i)<li[^>]*>(.*?)</li>").unwrap();
    let s = re_li.replace_all(&s, "\n* $1");

    // 4. Links
    let re_a = Regex::new(r#"(?i)<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)</a>"#).unwrap();
    let s = re_a.replace_all(&s, "[$2]($1)");

    // 5. Bold & Italic
    let re_strong = Regex::new(r"(?i)</?(?:strong|b)[^>]*>").unwrap();
    let s = re_strong.replace_all(&s, "**");

    let re_em = Regex::new(r"(?i)</?(?:em|i)[^>]*>").unwrap();
    let s = re_em.replace_all(&s, "*");

    // 6. Blockquotes
    let re_quote = Regex::new(r"(?i)<blockquote[^>]*>(.*?)</blockquote>").unwrap();
    let s = re_quote.replace_all(&s, "\n> $1\n");

    // 7. Strip all remaining HTML tags
    let re_tags = Regex::new(r"<[^>]+>").unwrap();
    let s = re_tags.replace_all(&s, "");

    // 8. Decode HTML entities
    let s = s
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
        .replace("&apos;", "'")
        .replace("&#8217;", "’")
        .replace("&#8220;", "“")
        .replace("&#8221;", "”")
        .replace("&#8211;", "–")
        .replace("&#8212;", "—");

    // 9. Clean excessive blank lines (more than 2 consecutive newlines)
    let re_newlines = Regex::new(r"\n{3,}").unwrap();
    let cleaned = re_newlines.replace_all(&s, "\n\n");

    cleaned.trim().to_string()
}

// Helper to decode Base64URL string from Gmail API
fn decode_base64_url(data: &str) -> Option<String> {
    let clean = data.replace('-', "+").replace('_', "/");
    let padded = match clean.len() % 4 {
        2 => format!("{}==", clean),
        3 => format!("{}=", clean),
        _ => clean,
    };
    base64::engine::general_purpose::STANDARD
        .decode(padded.as_bytes())
        .ok()
        .and_then(|bytes| String::from_utf8(bytes).ok())
}

// Extract header value from Gmail headers array
fn get_header(headers: &[serde_json::Value], name: &str) -> Option<String> {
    headers.iter().find_map(|h| {
        if h.get("name")
            .and_then(|n| n.as_str())
            .map(|n| n.eq_ignore_ascii_case(name))
            .unwrap_or(false)
        {
            h.get("value").and_then(|v| v.as_str()).map(|s| s.to_string())
        } else {
            None
        }
    })
}

// Parse "Name <email@example.com>" into (name, email)
fn parse_email_address(raw: &str) -> (Option<String>, String) {
    let trimmed = raw.trim();
    if let (Some(start), Some(end)) = (trimmed.find('<'), trimmed.find('>')) {
        let name = trimmed[..start].trim().trim_matches('"').trim();
        let email = trimmed[start + 1..end].trim();
        (
            if name.is_empty() { None } else { Some(name.to_string()) },
            email.to_string(),
        )
    } else {
        (None, trimmed.to_string())
    }
}

// Split multiple comma-separated email addresses
fn parse_email_list(raw: Option<String>) -> Vec<String> {
    raw.map(|s| {
        s.split(',')
            .map(|part| part.trim().to_string())
            .filter(|part| !part.is_empty())
            .collect()
    })
    .unwrap_or_default()
}

pub struct GmailManager {
    auth_path: PathBuf,
    cache_path: PathBuf,
    auth: Mutex<Option<GmailAuth>>,
    cache: Mutex<MailCacheData>,
    client: reqwest::Client,
}

impl GmailManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let auth_path = app_data_dir.join(AUTH_FILE_NAME);
        let cache_path = app_data_dir.join(CACHE_FILE_NAME);
        let calendar_auth_path = app_data_dir.join(CALENDAR_AUTH_FILE_NAME);

        let initial_auth = if auth_path.exists() {
            std::fs::read_to_string(&auth_path)
                .ok()
                .and_then(|data| serde_json::from_str::<GmailAuth>(&data).ok())
        } else if calendar_auth_path.exists() {
            // Check if calendar auth exists and has tokens
            std::fs::read_to_string(&calendar_auth_path)
                .ok()
                .and_then(|data| serde_json::from_str::<GmailAuth>(&data).ok())
        } else {
            None
        };

        let initial_cache = if cache_path.exists() {
            std::fs::read_to_string(&cache_path)
                .ok()
                .and_then(|data| serde_json::from_str::<MailCacheData>(&data).ok())
                .unwrap_or_default()
        } else {
            MailCacheData::default()
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(20))
            .build()
            .unwrap_or_default();

        Self {
            auth_path,
            cache_path,
            auth: Mutex::new(initial_auth),
            cache: Mutex::new(initial_cache),
            client,
        }
    }

    pub async fn get_state(&self) -> MailCacheData {
        let cache = self.cache.lock().await;
        let auth = self.auth.lock().await;
        let mut state = cache.clone();
        state.connected = auth.is_some();
        if let Some(ref a) = *auth {
            state.user_email = a.user_email.clone();
            state.user_name = a.user_name.clone();
        }
        state
    }

    fn persist_auth(&self, auth: &Option<GmailAuth>) -> Result<()> {
        if let Some(ref a) = auth {
            let json = serde_json::to_string_pretty(a)?;
            std::fs::write(&self.auth_path, json)?;
        } else if self.auth_path.exists() {
            let _ = std::fs::remove_file(&self.auth_path);
        }
        Ok(())
    }

    fn persist_cache(&self, cache: &MailCacheData) -> Result<()> {
        let json = serde_json::to_string_pretty(cache)?;
        std::fs::write(&self.cache_path, json)?;
        Ok(())
    }

    pub async fn disconnect(&self) -> Result<()> {
        {
            let mut auth = self.auth.lock().await;
            *auth = None;
            self.persist_auth(&None)?;
        }
        {
            let mut cache = self.cache.lock().await;
            *cache = MailCacheData::default();
            self.persist_cache(&cache)?;
        }
        Ok(())
    }

    pub async fn get_valid_access_token(&self) -> Result<String> {
        let mut auth_guard = self.auth.lock().await;
        let auth = auth_guard.as_mut().ok_or_else(|| anyhow!("Not connected to Gmail"))?;

        let now = Utc::now().timestamp();
        if now < auth.expires_at - 60 && !auth.access_token.is_empty() {
            return Ok(auth.access_token.clone());
        }

        // Refresh token
        let mut params = HashMap::new();
        params.insert("client_id", auth.client_id.as_str());
        if let Some(ref secret) = auth.client_secret {
            params.insert("client_secret", secret.as_str());
        }
        params.insert("refresh_token", auth.refresh_token.as_str());
        params.insert("grant_type", "refresh_token");

        let form_body = params
            .iter()
            .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&");

        let res = self
            .client
            .post("https://oauth2.googleapis.com/token")
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(form_body)
            .send()
            .await
            .context("Failed to contact Google token endpoint")?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to refresh Google access token for Gmail: {}", err_text));
        }

        #[derive(Deserialize)]
        struct TokenResponse {
            access_token: String,
            expires_in: i64,
        }

        let token_data: TokenResponse = res.json().await.context("Failed to parse token response")?;
        auth.access_token = token_data.access_token.clone();
        auth.expires_at = Utc::now().timestamp() + token_data.expires_in;

        self.persist_auth(&Some(auth.clone()))?;
        Ok(token_data.access_token)
    }

    pub async fn sync(&self) -> Result<MailCacheData> {
        let token = self.get_valid_access_token().await?;

        // 1. Fetch labels list
        let labels_res = self
            .client
            .get("https://gmail.googleapis.com/gmail/v1/users/me/labels")
            .bearer_auth(&token)
            .send()
            .await
            .context("Failed to fetch Gmail labels")?;

        if !labels_res.status().is_success() {
            let err_text = labels_res.text().await.unwrap_or_default();
            return Err(anyhow!("Error listing labels: {}", err_text));
        }

        #[derive(Deserialize)]
        struct LabelItem {
            id: String,
            name: String,
            #[serde(rename = "type")]
            label_type: Option<String>,
            #[serde(rename = "messagesUnread")]
            messages_unread: Option<usize>,
            #[serde(rename = "messagesTotal")]
            messages_total: Option<usize>,
            color: Option<LabelColor>,
        }

        #[derive(Deserialize)]
        struct LabelColor {
            #[serde(rename = "textColor")]
            text_color: Option<String>,
            #[serde(rename = "backgroundColor")]
            background_color: Option<String>,
        }

        #[derive(Deserialize)]
        struct LabelsResponse {
            labels: Option<Vec<LabelItem>>,
        }

        let labels_data: LabelsResponse = labels_res.json().await.context("Parse labels JSON")?;

        let mut mail_labels: Vec<MailLabel> = Vec::new();
        let mut inbox_unread_count = 0;

        for l in labels_data.labels.unwrap_or_default() {
            let is_system = l.label_type.as_deref() == Some("system");
            let unread = l.messages_unread.unwrap_or(0);
            if l.id == "INBOX" {
                inbox_unread_count = unread;
            }

            mail_labels.push(MailLabel {
                id: l.id,
                name: l.name,
                label_type: if is_system { "system".to_string() } else { "user".to_string() },
                unread_count: unread,
                total_count: l.messages_total.unwrap_or(0),
                bg_color: l.color.as_ref().and_then(|c| c.background_color.clone()),
                text_color: l.color.as_ref().and_then(|c| c.text_color.clone()),
            });
        }

        // Sort labels: System labels first (INBOX, STARRED, SENT, DRAFT, TRASH), then user labels alphabetically
        mail_labels.sort_by(|a, b| {
            let sys_order = |id: &str| match id {
                "INBOX" => 0,
                "STARRED" => 1,
                "SENT" => 2,
                "DRAFT" => 3,
                "TRASH" => 4,
                "SPAM" => 5,
                _ => 10,
            };
            let ord_a = sys_order(&a.id);
            let ord_b = sys_order(&b.id);
            if ord_a != ord_b {
                ord_a.cmp(&ord_b)
            } else {
                a.name.to_lowercase().cmp(&b.name.to_lowercase())
            }
        });

        // 2. Fetch recent threads list (max 50)
        let threads_res = self
            .client
            .get("https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=50")
            .bearer_auth(&token)
            .send()
            .await
            .context("Failed to fetch Gmail threads")?;

        if !threads_res.status().is_success() {
            let err_text = threads_res.text().await.unwrap_or_default();
            return Err(anyhow!("Error listing threads: {}", err_text));
        }

        #[derive(Deserialize)]
        struct ThreadItemRef {
            id: String,
            #[allow(dead_code)]
            snippet: Option<String>,
            #[serde(rename = "historyId")]
            history_id: Option<String>,
        }

        #[derive(Deserialize)]
        struct ThreadsResponse {
            threads: Option<Vec<ThreadItemRef>>,
        }

        let threads_data: ThreadsResponse = threads_res.json().await.context("Parse threads JSON")?;
        let raw_threads = threads_data.threads.unwrap_or_default();

        // 3. Batch fetch thread details (top 20 for preview metadata)
        // Check existing cache to preserve already parsed messages
        let existing_cache = self.cache.lock().await.clone();
        let existing_map: HashMap<String, MailThread> = existing_cache
            .threads
            .into_iter()
            .map(|t| (t.id.clone(), t))
            .collect();

        let mut parsed_threads: Vec<MailThread> = Vec::new();

        for t_ref in raw_threads.iter().take(30) {
            if let Some(cached) = existing_map.get(&t_ref.id) {
                // If history_id matches, reuse cached thread
                if cached.history_id == t_ref.history_id && cached.messages.is_some() {
                    parsed_threads.push(cached.clone());
                    continue;
                }
            }

            // Fetch full thread metadata
            if let Ok(thread) = self.fetch_single_thread(&t_ref.id, &token).await {
                parsed_threads.push(thread);
            }
        }

        // 4. Update user info if missing
        let user_info = self.fetch_user_profile(&token).await.unwrap_or_default();

        let new_cache = MailCacheData {
            connected: true,
            user_email: user_info.0,
            user_name: user_info.1,
            last_synced: Some(Utc::now().timestamp()),
            unread_count: inbox_unread_count,
            labels: mail_labels,
            threads: parsed_threads,
        };

        {
            let mut cache = self.cache.lock().await;
            *cache = new_cache.clone();
            self.persist_cache(&cache)?;
        }

        Ok(new_cache)
    }

    async fn fetch_user_profile(&self, token: &str) -> Result<(Option<String>, Option<String>)> {
        let res = self
            .client
            .get("https://www.googleapis.com/oauth2/v2/userinfo")
            .bearer_auth(token)
            .send()
            .await?;
        if res.status().is_success() {
            #[derive(Deserialize)]
            struct UserInfo {
                email: Option<String>,
                name: Option<String>,
            }
            let info: UserInfo = res.json().await?;
            Ok((info.email, info.name))
        } else {
            Ok((None, None))
        }
    }

    async fn fetch_single_thread(&self, thread_id: &str, token: &str) -> Result<MailThread> {
        let url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/threads/{}?format=full",
            thread_id
        );
        let res = self.client.get(&url).bearer_auth(token).send().await?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to fetch thread {}: {}", thread_id, err));
        }

        let raw: serde_json::Value = res.json().await?;
        let history_id = raw.get("historyId").and_then(|v| v.as_str()).map(|s| s.to_string());
        let messages_arr = raw.get("messages").and_then(|v| v.as_array()).cloned().unwrap_or_default();

        let mut parsed_messages: Vec<MailMessage> = Vec::new();
        let mut thread_unread = false;
        let mut thread_starred = false;
        let mut thread_label_ids = Vec::new();

        for msg_val in &messages_arr {
            let msg_id = msg_val.get("id").and_then(|v| v.as_str()).unwrap_or_default().to_string();
            let labels: Vec<String> = msg_val
                .get("labelIds")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter().filter_map(|x| x.as_str().map(|s| s.to_string())).collect())
                .unwrap_or_default();

            for l in &labels {
                if !thread_label_ids.contains(l) {
                    thread_label_ids.push(l.clone());
                }
            }

            let is_unread = labels.iter().any(|l| l == "UNREAD");
            let is_starred = labels.iter().any(|l| l == "STARRED");
            if is_unread {
                thread_unread = true;
            }
            if is_starred {
                thread_starred = true;
            }

            let internal_date = msg_val
                .get("internalDate")
                .and_then(|v| v.as_str())
                .and_then(|s| s.parse::<i64>().ok())
                .unwrap_or_else(|| Utc::now().timestamp_millis());
            let timestamp_secs = internal_date / 1000;

            let payload = msg_val.get("payload");
            let headers = payload
                .and_then(|p| p.get("headers"))
                .and_then(|h| h.as_array())
                .cloned()
                .unwrap_or_default();

            let subject = get_header(&headers, "Subject").unwrap_or_else(|| "(no subject)".to_string());
            let from_header = get_header(&headers, "From").unwrap_or_default();
            let (from_name, from_email) = parse_email_address(&from_header);
            let to_list = parse_email_list(get_header(&headers, "To"));
            let cc_list = parse_email_list(get_header(&headers, "Cc"));
            let bcc_list = parse_email_list(get_header(&headers, "Bcc"));
            let date_str = get_header(&headers, "Date").unwrap_or_default();
            let message_id_hdr = get_header(&headers, "Message-ID");
            let snippet = msg_val.get("snippet").and_then(|v| v.as_str()).unwrap_or_default().to_string();

            // Extract body parts & attachments
            let (body_text, body_html, attachments) = if let Some(p) = payload {
                extract_body_and_attachments(p)
            } else {
                (None, None, Vec::new())
            };

            // Markdown conversion
            let body_markdown = if let Some(ref html) = body_html {
                html_to_clean_markdown(html)
            } else if let Some(ref text) = body_text {
                text.clone()
            } else {
                snippet.clone()
            };

            parsed_messages.push(MailMessage {
                id: msg_id,
                thread_id: thread_id.to_string(),
                from: from_email,
                from_name,
                to: to_list,
                cc: cc_list,
                bcc: bcc_list,
                date: date_str,
                timestamp: timestamp_secs,
                subject,
                snippet,
                body_html,
                body_text,
                body_markdown,
                attachments,
                label_ids: labels,
                unread: is_unread,
                starred: is_starred,
                message_id_header: message_id_hdr,
            });
        }

        // Summary details from last message or first message
        let last_msg = parsed_messages.last();
        let subject = parsed_messages
            .first()
            .map(|m| m.subject.clone())
            .unwrap_or_else(|| "(no subject)".to_string());
        let from = last_msg.map(|m| m.from.clone()).unwrap_or_default();
        let from_name = last_msg.and_then(|m| m.from_name.clone());
        let to = last_msg.map(|m| m.to.clone()).unwrap_or_default();
        let date = last_msg.map(|m| m.date.clone()).unwrap_or_default();
        let timestamp = last_msg.map(|m| m.timestamp).unwrap_or_else(|| Utc::now().timestamp());
        let snippet = last_msg.map(|m| m.snippet.clone()).unwrap_or_default();
        let message_count = parsed_messages.len();

        Ok(MailThread {
            id: thread_id.to_string(),
            snippet,
            history_id,
            subject,
            from,
            from_name,
            to,
            date,
            timestamp,
            message_count,
            unread: thread_unread,
            starred: thread_starred,
            label_ids: thread_label_ids,
            messages: Some(parsed_messages),
        })
    }

    pub async fn get_thread(&self, thread_id: &str) -> Result<MailThread> {
        // First check cache if messages are already populated
        {
            let cache = self.cache.lock().await;
            if let Some(t) = cache.threads.iter().find(|t| t.id == thread_id) {
                if let Some(ref msgs) = t.messages {
                    if !msgs.is_empty() {
                        return Ok(t.clone());
                    }
                }
            }
        }

        let token = self.get_valid_access_token().await?;
        let thread = self.fetch_single_thread(thread_id, &token).await?;

        // Update local cache
        {
            let mut cache = self.cache.lock().await;
            if let Some(existing) = cache.threads.iter_mut().find(|t| t.id == thread_id) {
                *existing = thread.clone();
            } else {
                cache.threads.insert(0, thread.clone());
            }
            self.persist_cache(&cache)?;
        }

        Ok(thread)
    }

    pub async fn modify_thread(
        &self,
        thread_id: &str,
        add_labels: &[String],
        remove_labels: &[String],
    ) -> Result<MailThread> {
        let token = self.get_valid_access_token().await?;

        let body = serde_json::json!({
            "addLabelIds": add_labels,
            "removeLabelIds": remove_labels,
        });

        let url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/threads/{}/modify",
            thread_id
        );
        let res = self
            .client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to modify thread {}: {}", thread_id, err));
        }

        // Fetch refreshed thread
        let updated = self.fetch_single_thread(thread_id, &token).await?;

        // Update cache
        {
            let mut cache = self.cache.lock().await;
            if let Some(t) = cache.threads.iter_mut().find(|t| t.id == thread_id) {
                *t = updated.clone();
            }
            self.persist_cache(&cache)?;
        }

        Ok(updated)
    }

    pub async fn trash_thread(&self, thread_id: &str) -> Result<()> {
        let token = self.get_valid_access_token().await?;
        let url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/threads/{}/trash",
            thread_id
        );
        let res = self.client.post(&url).bearer_auth(&token).send().await?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to trash thread {}: {}", thread_id, err));
        }

        // Remove or update in cache
        {
            let mut cache = self.cache.lock().await;
            if let Some(t) = cache.threads.iter_mut().find(|t| t.id == thread_id) {
                if !t.label_ids.contains(&"TRASH".to_string()) {
                    t.label_ids.push("TRASH".to_string());
                }
                t.label_ids.retain(|l| l != "INBOX");
            }
            self.persist_cache(&cache)?;
        }

        Ok(())
    }

    pub async fn send_mail(&self, payload: SendMailPayload) -> Result<MailMessage> {
        let token = self.get_valid_access_token().await?;
        let state = self.get_state().await;
        let my_email = state.user_email.unwrap_or_else(|| "me".to_string());

        // Construct RFC 2822 email format
        let boundary = format!("scratch_boundary_{}", Utc::now().timestamp_nanos_opt().unwrap_or(0));
        let mut lines = Vec::new();

        lines.push(format!("From: {}", my_email));
        lines.push(format!("To: {}", payload.to.join(", ")));
        if let Some(ref cc) = payload.cc {
            if !cc.is_empty() {
                lines.push(format!("Cc: {}", cc.join(", ")));
            }
        }
        if let Some(ref bcc) = payload.bcc {
            if !bcc.is_empty() {
                lines.push(format!("Bcc: {}", bcc.join(", ")));
            }
        }
        lines.push(format!("Subject: {}", payload.subject));
        lines.push(format!("Date: {}", Utc::now().to_rfc2822()));
        let msg_id_hdr = format!("<{}@scratch.desktop>", uuid_like_id());
        lines.push(format!("Message-ID: {}", msg_id_hdr));

        if let Some(ref in_reply) = payload.in_reply_to {
            lines.push(format!("In-Reply-To: {}", in_reply));
        }
        if let Some(ref refs) = payload.references {
            lines.push(format!("References: {}", refs));
        }

        lines.push("MIME-Version: 1.0".to_string());
        lines.push(format!(
            "Content-Type: multipart/alternative; boundary=\"{}\"",
            boundary
        ));
        lines.push("".to_string());

        // Part 1: text/plain
        lines.push(format!("--{}", boundary));
        lines.push("Content-Type: text/plain; charset=UTF-8".to_string());
        lines.push("Content-Transfer-Encoding: 7bit".to_string());
        lines.push("".to_string());
        lines.push(payload.body_text.clone());
        lines.push("".to_string());

        // Part 2: text/html
        let html_content = payload
            .body_html
            .clone()
            .unwrap_or_else(|| format!("<div>{}</div>", payload.body_text.replace('\n', "<br>")));
        lines.push(format!("--{}", boundary));
        lines.push("Content-Type: text/html; charset=UTF-8".to_string());
        lines.push("Content-Transfer-Encoding: 7bit".to_string());
        lines.push("".to_string());
        lines.push(html_content.clone());
        lines.push("".to_string());

        lines.push(format!("--{}--", boundary));
        lines.push("".to_string());

        let raw_email = lines.join("\r\n");
        let raw_base64url = URL_SAFE_NO_PAD.encode(raw_email.as_bytes());

        let mut send_body = serde_json::json!({
            "raw": raw_base64url,
        });

        if let Some(ref t_id) = payload.thread_id {
            send_body["threadId"] = serde_json::Value::String(t_id.clone());
        }

        let res = self
            .client
            .post("https://gmail.googleapis.com/gmail/v1/users/me/messages/send")
            .bearer_auth(&token)
            .json(&send_body)
            .send()
            .await
            .context("Failed to dispatch email via Gmail API")?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to send email: {}", err));
        }

        #[derive(Deserialize)]
        struct SendRes {
            id: String,
            #[serde(rename = "threadId")]
            thread_id: String,
        }

        let sent: SendRes = res.json().await?;

        // Fast local message object
        let created_msg = MailMessage {
            id: sent.id,
            thread_id: sent.thread_id,
            from: my_email,
            from_name: state.user_name,
            to: payload.to,
            cc: payload.cc.unwrap_or_default(),
            bcc: payload.bcc.unwrap_or_default(),
            date: Utc::now().to_rfc2822(),
            timestamp: Utc::now().timestamp(),
            subject: payload.subject,
            snippet: payload.body_text.chars().take(100).collect(),
            body_html: Some(html_content),
            body_text: Some(payload.body_text.clone()),
            body_markdown: payload.body_text,
            attachments: Vec::new(),
            label_ids: vec!["SENT".to_string()],
            unread: false,
            starred: false,
            message_id_header: Some(msg_id_hdr),
        };

        // Trigger background sync to refresh thread list
        let _ = self.sync().await;

        Ok(created_msg)
    }

    pub async fn get_attachment_data(
        &self,
        message_id: &str,
        attachment_id: &str,
    ) -> Result<AttachmentData> {
        let token = self.get_valid_access_token().await?;
        let url = format!(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages/{}/attachments/{}",
            message_id, attachment_id
        );
        let res = self.client.get(&url).bearer_auth(&token).send().await?;

        if !res.status().is_success() {
            let err = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to fetch attachment {}: {}", attachment_id, err));
        }

        #[derive(Deserialize)]
        struct RawAttachmentResponse {
            size: Option<usize>,
            data: Option<String>,
        }

        let raw: RawAttachmentResponse = res.json().await?;
        let raw_data = raw.data.unwrap_or_default();
        let clean = raw_data.replace('-', "+").replace('_', "/");
        let padded = match clean.len() % 4 {
            2 => format!("{}==", clean),
            3 => format!("{}=", clean),
            _ => clean,
        };

        Ok(AttachmentData {
            size: raw.size.unwrap_or(0),
            data: padded,
        })
    }
}

// Helper to recursively traverse payload parts for bodies and attachments
fn extract_body_and_attachments(
    payload: &serde_json::Value,
) -> (Option<String>, Option<String>, Vec<MailAttachment>) {
    let mut body_text = None;
    let mut body_html = None;
    let mut attachments = Vec::new();

    fn walk(
        part: &serde_json::Value,
        text: &mut Option<String>,
        html: &mut Option<String>,
        atts: &mut Vec<MailAttachment>,
    ) {
        let mime = part
            .get("mimeType")
            .and_then(|v| v.as_str())
            .unwrap_or_default();
        let filename = part
            .get("filename")
            .and_then(|v| v.as_str())
            .unwrap_or_default();

        if !filename.is_empty() {
            let att_id = part
                .get("body")
                .and_then(|b| b.get("attachmentId"))
                .and_then(|v| v.as_str())
                .unwrap_or_default()
                .to_string();
            let size = part
                .get("body")
                .and_then(|b| b.get("size"))
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize;
            atts.push(MailAttachment {
                id: att_id,
                filename: filename.to_string(),
                mime_type: mime.to_string(),
                size,
            });
            return;
        }

        if mime == "text/plain" && text.is_none() {
            if let Some(data) = part
                .get("body")
                .and_then(|b| b.get("data"))
                .and_then(|v| v.as_str())
            {
                *text = decode_base64_url(data);
            }
        } else if mime == "text/html" && html.is_none() {
            if let Some(data) = part
                .get("body")
                .and_then(|b| b.get("data"))
                .and_then(|v| v.as_str())
            {
                *html = decode_base64_url(data);
            }
        }

        if let Some(sub_parts) = part.get("parts").and_then(|p| p.as_array()) {
            for sp in sub_parts {
                walk(sp, text, html, atts);
            }
        }
    }

    walk(payload, &mut body_text, &mut body_html, &mut attachments);
    (body_text, body_html, attachments)
}

// -----------------------------------------------------------------------------
// OAuth Desktop Flow for Gmail
// -----------------------------------------------------------------------------

#[tauri::command]
pub async fn mail_start_auth(
    client_id: Option<String>,
    client_secret: Option<String>,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailCacheData, String> {
    let resolved_client_id = client_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| GMAIL_DEFAULT_CLIENT_ID.to_string());

    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to start local OAuth listener for Gmail: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get listener port: {}", e))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

    // Request Gmail modify, calendar, and userinfo scopes for unified Google connection
    let scopes = "https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        urlencoding::encode(&resolved_client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode(scopes)
    );

    let _ = open::that(&auth_url);

    let html_success = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Scratch — Gmail Connected</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121214; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; padding: 40px; border-radius: 16px; background: #1a1a1e; border: 1px solid #27272a; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.4); }
  h1 { font-size: 20px; font-weight: 600; margin: 0 0 10px; color: #fff; }
  p { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin: 0; }
  .dot { width: 10px; height: 10px; background: #eab308; border-radius: 50%; display: inline-block; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="dot"></div>
    <h1>Connected to Gmail</h1>
    <p>You can close this tab and return to Scratch.</p>
  </div>
</body>
</html>"#;

    let html_failure = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Scratch — Connection Failed</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #121214; color: #f4f4f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
  .card { text-align: center; padding: 40px; border-radius: 16px; background: #1a1a1e; border: 1px solid #ef4444; max-width: 400px; }
  h1 { font-size: 20px; margin: 0 0 10px; color: #ef4444; }
  p { font-size: 14px; color: #a1a1aa; margin: 0; }
</style>
</head>
<body>
  <div class="card">
    <h1>Connection Cancelled</h1>
    <p>Authorization code was not received. Please try again in Scratch.</p>
  </div>
</body>
</html>"#;

    let mut code: Option<String> = None;
    let start_time = std::time::Instant::now();

    while start_time.elapsed().as_secs() < 120 {
        let (mut stream, _) = match listener.accept() {
            Ok(s) => s,
            Err(_) => continue,
        };

        let mut buffer = [0u8; 4096];
        let bytes_read = match stream.read(&mut buffer) {
            Ok(n) if n > 0 => n,
            _ => continue,
        };
        let request_str = String::from_utf8_lossy(&buffer[..bytes_read]);

        let path = match request_str.lines().next() {
            Some(line) => {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    parts[1].to_string()
                } else {
                    continue;
                }
            }
            None => continue,
        };

        if path.starts_with("/favicon") {
            let res = "HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
            let _ = stream.write_all(res.as_bytes());
            continue;
        }

        let dummy_url = format!("http://localhost{}", path);
        if let Ok(parsed) = Url::parse(&dummy_url) {
            if let Some((_, err_desc)) = parsed.query_pairs().find(|(k, _)| k == "error") {
                let http_response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html_failure.len(),
                    html_failure
                );
                let _ = stream.write_all(http_response.as_bytes());
                let _ = stream.flush();
                return Err(format!("Google Gmail login error: {}", err_desc));
            }

            if let Some((_, c)) = parsed.query_pairs().find(|(k, _)| k == "code") {
                code = Some(c.into_owned());
                let http_response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                    html_success.len(),
                    html_success
                );
                let _ = stream.write_all(http_response.as_bytes());
                let _ = stream.flush();
                break;
            }
        }
    }

    let auth_code = code.ok_or_else(|| "Authorization code was not received in callback".to_string())?;

    // Exchange auth_code for tokens
    let mut params = HashMap::new();
    params.insert("code", auth_code.as_str());
    params.insert("client_id", resolved_client_id.as_str());
    if let Some(ref sec) = client_secret {
        if !sec.trim().is_empty() {
            params.insert("client_secret", sec.trim());
        }
    }
    params.insert("redirect_uri", redirect_uri.as_str());
    params.insert("grant_type", "authorization_code");

    let form_body = params
        .iter()
        .map(|(k, v)| format!("{}={}", urlencoding::encode(k), urlencoding::encode(v)))
        .collect::<Vec<_>>()
        .join("&");

    let client = reqwest::Client::new();
    let res = client
        .post("https://oauth2.googleapis.com/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(form_body)
        .send()
        .await
        .map_err(|e| format!("Failed to contact token endpoint: {}", e))?;

    if !res.status().is_success() {
        let err_text = res.text().await.unwrap_or_default();
        return Err(format!("Token exchange failed: {}", err_text));
    }

    #[derive(Deserialize)]
    struct TokenResponse {
        access_token: String,
        expires_in: i64,
        refresh_token: Option<String>,
    }

    let token_data: TokenResponse = res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    let refresh_token = token_data.refresh_token.ok_or_else(|| {
        "Google did not return a refresh token. Revoke Scratch access at https://myaccount.google.com/permissions and retry."
            .to_string()
    })?;

    // Fetch user info
    let user_info_res = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&token_data.access_token)
        .send()
        .await;

    let (user_email, user_name) = if let Ok(info_res) = user_info_res {
        #[derive(Deserialize)]
        struct UserInfo {
            email: Option<String>,
            name: Option<String>,
        }
        if let Ok(info) = info_res.json::<UserInfo>().await {
            (info.email, info.name)
        } else {
            (None, None)
        }
    } else {
        (None, None)
    };

    let new_auth = GmailAuth {
        client_id: resolved_client_id,
        client_secret,
        access_token: token_data.access_token,
        refresh_token,
        expires_at: Utc::now().timestamp() + token_data.expires_in,
        user_email,
        user_name,
    };

    {
        let mut auth_guard = manager.auth.lock().await;
        *auth_guard = Some(new_auth.clone());
        manager
            .persist_auth(&auth_guard)
            .map_err(|e| format!("Failed to save Gmail auth: {}", e))?;
    }

    // Trigger initial sync
    manager
        .sync()
        .await
        .map_err(|e| format!("Connected to Gmail but initial sync failed: {}", e))
}

#[tauri::command]
pub async fn mail_get_state(
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailCacheData, String> {
    Ok(manager.get_state().await)
}

#[tauri::command]
pub async fn mail_sync(
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailCacheData, String> {
    manager.sync().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_disconnect(
    manager: State<'_, Arc<GmailManager>>,
) -> Result<(), String> {
    manager.disconnect().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_get_thread(
    thread_id: String,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailThread, String> {
    manager.get_thread(&thread_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_modify_thread(
    payload: ModifyThreadPayload,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailThread, String> {
    manager
        .modify_thread(&payload.thread_id, &payload.add_label_ids, &payload.remove_label_ids)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_trash_thread(
    thread_id: String,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<(), String> {
    manager.trash_thread(&thread_id).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_send(
    payload: SendMailPayload,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<MailMessage, String> {
    manager.send_mail(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn mail_get_attachment_data(
    message_id: String,
    attachment_id: String,
    manager: State<'_, Arc<GmailManager>>,
) -> Result<AttachmentData, String> {
    manager
        .get_attachment_data(&message_id, &attachment_id)
        .await
        .map_err(|e| e.to_string())
}
