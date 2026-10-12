use anyhow::{anyhow, Context, Result};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;
use url::Url;

// Fallback client ID (can be overridden via Settings or environment)
pub const DEFAULT_CLIENT_ID: &str =
    "688447609926-eofijjrca2qvbt7e936ccu6d8c4fdrmh.apps.googleusercontent.com";

const AUTH_FILE_NAME: &str = "google_calendar_auth.json";
const CACHE_FILE_NAME: &str = "google_calendar_cache.json";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GoogleCalendarAuth {
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
pub struct CalendarEntry {
    pub id: String,
    pub summary: String,
    pub description: Option<String>,
    pub primary: bool,
    pub bg_color: Option<String>,
    pub fg_color: Option<String>,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub calendar_id: String,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub all_day: bool,
    pub meet_link: Option<String>,
    pub html_link: Option<String>,
    pub attendees: Vec<String>,
    pub status: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct CalendarCacheData {
    pub connected: bool,
    pub user_email: Option<String>,
    pub user_name: Option<String>,
    pub last_synced: Option<i64>,
    pub calendars: Vec<CalendarEntry>,
    pub events: Vec<CalendarEvent>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateEventPayload {
    pub calendar_id: String,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub all_day: bool,
    pub attendees: Vec<String>,
    pub add_meet: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateEventPayload {
    pub calendar_id: String,
    pub event_id: String,
    pub title: String,
    pub description: Option<String>,
    pub location: Option<String>,
    pub start_time: String,
    pub end_time: String,
    pub all_day: bool,
    pub attendees: Vec<String>,
}

fn google_event_color(color_id: Option<&str>, default_color: Option<&str>) -> Option<String> {
    if let Some(cid) = color_id {
        let hex = match cid {
            "1" => "#7986cb",
            "2" => "#33b679",
            "3" => "#8e24aa",
            "4" => "#e67c73",
            "5" => "#f6bf26",
            "6" => "#f4511e",
            "7" => "#039be5",
            "8" => "#616161",
            "9" => "#3f51b5",
            "10" => "#0b8043",
            "11" => "#d50000",
            _ => return default_color.map(|s| s.to_string()),
        };
        Some(hex.to_string())
    } else {
        default_color.map(|s| s.to_string())
    }
}

pub struct CalendarManager {
    auth_path: PathBuf,
    cache_path: PathBuf,
    auth: Mutex<Option<GoogleCalendarAuth>>,
    cache: Mutex<CalendarCacheData>,
    client: reqwest::Client,
}

impl CalendarManager {
    pub fn new(app_data_dir: PathBuf) -> Self {
        let auth_path = app_data_dir.join(AUTH_FILE_NAME);
        let cache_path = app_data_dir.join(CACHE_FILE_NAME);

        let initial_auth = if auth_path.exists() {
            std::fs::read_to_string(&auth_path)
                .ok()
                .and_then(|data| serde_json::from_str::<GoogleCalendarAuth>(&data).ok())
        } else {
            None
        };

        let initial_cache = if cache_path.exists() {
            std::fs::read_to_string(&cache_path)
                .ok()
                .and_then(|data| serde_json::from_str::<CalendarCacheData>(&data).ok())
                .unwrap_or_default()
        } else {
            CalendarCacheData::default()
        };

        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
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

    pub async fn get_state(&self) -> CalendarCacheData {
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

    fn persist_auth(&self, auth: &Option<GoogleCalendarAuth>) -> Result<()> {
        if let Some(ref a) = auth {
            let json = serde_json::to_string_pretty(a)?;
            std::fs::write(&self.auth_path, json)?;
        } else if self.auth_path.exists() {
            let _ = std::fs::remove_file(&self.auth_path);
        }
        Ok(())
    }

    fn persist_cache(&self, cache: &CalendarCacheData) -> Result<()> {
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
            *cache = CalendarCacheData::default();
            self.persist_cache(&cache)?;
        }
        Ok(())
    }

    pub async fn toggle_calendar_visibility(&self, calendar_id: &str, selected: bool) -> Result<CalendarCacheData> {
        let mut cache = self.cache.lock().await;
        for c in &mut cache.calendars {
            if c.id == calendar_id {
                c.selected = selected;
            }
        }
        self.persist_cache(&cache)?;
        drop(cache);
        Ok(self.get_state().await)
    }

    pub async fn get_valid_access_token(&self) -> Result<String> {
        let mut auth_guard = self.auth.lock().await;
        let auth = auth_guard.as_mut().ok_or_else(|| anyhow!("Not connected to Google Calendar"))?;

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
            return Err(anyhow!("Failed to refresh Google access token: {}", err_text));
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

    pub async fn sync(&self) -> Result<CalendarCacheData> {
        let token = self.get_valid_access_token().await?;

        // 1. Fetch calendar list
        let cal_list_res = self
            .client
            .get("https://www.googleapis.com/calendar/v3/users/me/calendarList")
            .bearer_auth(&token)
            .send()
            .await
            .context("Failed to fetch Google calendar list")?;

        if !cal_list_res.status().is_success() {
            let err_text = cal_list_res.text().await.unwrap_or_default();
            return Err(anyhow!("Error listing calendars: {}", err_text));
        }

        #[derive(Deserialize)]
        struct RawCalendarItem {
            id: String,
            summary: Option<String>,
            description: Option<String>,
            primary: Option<bool>,
            #[serde(rename = "backgroundColor")]
            background_color: Option<String>,
            #[serde(rename = "foregroundColor")]
            foreground_color: Option<String>,
        }

        #[derive(Deserialize)]
        struct RawCalendarList {
            items: Option<Vec<RawCalendarItem>>,
        }

        let raw_list: RawCalendarList = cal_list_res.json().await?;
        let existing_selected: HashMap<String, bool> = {
            let cache = self.cache.lock().await;
            cache.calendars.iter().map(|c| (c.id.clone(), c.selected)).collect()
        };

        let mut calendars = Vec::new();
        if let Some(items) = raw_list.items {
            for item in items {
                let is_primary = item.primary.unwrap_or(false);
                let selected = existing_selected.get(&item.id).copied().unwrap_or(true);
                calendars.push(CalendarEntry {
                    id: item.id,
                    summary: item.summary.unwrap_or_else(|| "Untitled Calendar".to_string()),
                    description: item.description,
                    primary: is_primary,
                    bg_color: item.background_color,
                    fg_color: item.foreground_color,
                    selected,
                });
            }
        }

        // 2. Fetch events from selected calendars (-90 days to +180 days)
        let now = Utc::now();
        let time_min = (now - Duration::days(90)).format("%Y-%m-%dT%H:%M:%SZ").to_string();
        let time_max = (now + Duration::days(180)).format("%Y-%m-%dT%H:%M:%SZ").to_string();

        let mut all_events = Vec::new();

        for cal in &calendars {
            if !cal.selected {
                continue;
            }

            let encoded_id = urlencoding::encode(&cal.id);
            let encoded_time_min = urlencoding::encode(&time_min);
            let encoded_time_max = urlencoding::encode(&time_max);
            let url = format!(
                "https://www.googleapis.com/calendar/v3/calendars/{}/events?timeMin={}&timeMax={}&singleEvents=true&orderBy=startTime&maxResults=2500",
                encoded_id, encoded_time_min, encoded_time_max
            );

            let ev_res = self
                .client
                .get(&url)
                .bearer_auth(&token)
                .send()
                .await;

            match ev_res {
                Ok(res) => {
                    if !res.status().is_success() {
                        let err_text = res.text().await.unwrap_or_default();
                        eprintln!("[Calendar] Failed to fetch events for {}: {}", cal.id, err_text);
                        continue;
                    }
                    #[derive(Deserialize)]
                    struct EventDateTime {
                        #[serde(rename = "dateTime")]
                        date_time: Option<String>,
                        date: Option<String>,
                    }

                    #[derive(Deserialize)]
                    struct Attendee {
                        email: Option<String>,
                        #[serde(rename = "displayName")]
                        display_name: Option<String>,
                    }

                    #[derive(Deserialize)]
                    struct EntryPoint {
                        uri: Option<String>,
                    }

                    #[derive(Deserialize)]
                    struct ConferenceData {
                        #[serde(rename = "entryPoints")]
                        entry_points: Option<Vec<EntryPoint>>,
                    }

                    #[derive(Deserialize)]
                    struct RawEvent {
                        id: String,
                        summary: Option<String>,
                        description: Option<String>,
                        location: Option<String>,
                        start: Option<EventDateTime>,
                        end: Option<EventDateTime>,
                        #[serde(rename = "hangoutLink")]
                        hangout_link: Option<String>,
                        #[serde(rename = "htmlLink")]
                        html_link: Option<String>,
                        #[serde(rename = "conferenceData")]
                        conference_data: Option<ConferenceData>,
                        attendees: Option<Vec<Attendee>>,
                        status: Option<String>,
                        #[serde(rename = "colorId")]
                        color_id: Option<String>,
                    }

                    #[derive(Deserialize)]
                    struct RawEventList {
                        items: Option<Vec<RawEvent>>,
                    }

                    match res.json::<RawEventList>().await {
                        Ok(raw_events) => {
                            if let Some(items) = raw_events.items {
                                for ev in items {
                                    let (start_str, all_day) = match ev.start {
                                        Some(ref s) => {
                                            if let Some(ref dt) = s.date_time {
                                                (dt.clone(), false)
                                            } else if let Some(ref d) = s.date {
                                                (d.clone(), true)
                                            } else {
                                                (now.format("%Y-%m-%dT%H:%M:%SZ").to_string(), false)
                                            }
                                        }
                                        None => (now.format("%Y-%m-%dT%H:%M:%SZ").to_string(), false),
                                    };

                                    let end_str = match ev.end {
                                        Some(ref e) => {
                                            if let Some(ref dt) = e.date_time {
                                                dt.clone()
                                            } else if let Some(ref d) = e.date {
                                                d.clone()
                                            } else {
                                                start_str.clone()
                                            }
                                        }
                                        None => start_str.clone(),
                                    };

                                    let meet_link = ev
                                        .hangout_link
                                        .or_else(|| {
                                            ev.conference_data
                                                .and_then(|cd| cd.entry_points)
                                                .and_then(|eps| eps.into_iter().find_map(|ep| ep.uri))
                                        });

                                    let attendees = ev
                                        .attendees
                                        .map(|atts| {
                                            atts.into_iter()
                                                .filter_map(|a| a.display_name.or(a.email))
                                                .collect()
                                        })
                                        .unwrap_or_default();

                                    let event_color = google_event_color(ev.color_id.as_deref(), cal.bg_color.as_deref());

                                    all_events.push(CalendarEvent {
                                        id: ev.id,
                                        calendar_id: cal.id.clone(),
                                        title: ev.summary.unwrap_or_else(|| "Untitled Event".to_string()),
                                        description: ev.description,
                                        location: ev.location,
                                        start_time: start_str,
                                        end_time: end_str,
                                        all_day,
                                        meet_link,
                                        html_link: ev.html_link,
                                        attendees,
                                        status: ev.status,
                                        color: event_color,
                                    });
                                }
                            }
                        }
                        Err(e) => {
                            eprintln!("[Calendar] Failed to deserialize events for {}: {}", cal.id, e);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("[Calendar] Network error fetching events for {}: {}", cal.id, e);
                }
            }
        }

        // Sort events chronologically
        all_events.sort_by(|a, b| a.start_time.cmp(&b.start_time));

        let user_info = {
            let auth = self.auth.lock().await;
            (auth.as_ref().and_then(|a| a.user_email.clone()), auth.as_ref().and_then(|a| a.user_name.clone()))
        };

        let new_cache = CalendarCacheData {
            connected: true,
            user_email: user_info.0,
            user_name: user_info.1,
            last_synced: Some(Utc::now().timestamp()),
            calendars,
            events: all_events,
        };

        {
            let mut cache = self.cache.lock().await;
            *cache = new_cache.clone();
            self.persist_cache(&cache)?;
        }

        Ok(new_cache)
    }

    pub async fn create_event(&self, payload: CreateEventPayload) -> Result<CalendarEvent> {
        let token = self.get_valid_access_token().await?;

        let mut body = serde_json::json!({
            "summary": payload.title,
            "description": payload.description.as_deref().unwrap_or_default(),
            "location": payload.location.as_deref().unwrap_or_default(),
        });

        if payload.all_day {
            body["start"] = serde_json::json!({ "date": payload.start_time });
            body["end"] = serde_json::json!({ "date": payload.end_time });
        } else {
            body["start"] = serde_json::json!({ "dateTime": payload.start_time });
            body["end"] = serde_json::json!({ "dateTime": payload.end_time });
        }

        if !payload.attendees.is_empty() {
            let atts: Vec<_> = payload
                .attendees
                .iter()
                .map(|email| serde_json::json!({ "email": email }))
                .collect();
            body["attendees"] = serde_json::Value::Array(atts);
        }

        if payload.add_meet {
            body["conferenceData"] = serde_json::json!({
                "createRequest": {
                    "requestId": uuid_like_id(),
                    "conferenceSolutionKey": {
                        "type": "hangoutsMeet"
                    }
                }
            });
        }

        let encoded_id = urlencoding::encode(&payload.calendar_id);
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/{}/events?conferenceDataVersion=1",
            encoded_id
        );

        let res = self
            .client
            .post(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("Failed to post event to Google Calendar")?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to create event: {}", err_text));
        }

        // Trigger sync to update local cache
        self.sync().await?;

        // Return created event from cache or build one
        let state = self.get_state().await;
        let created = state
            .events
            .into_iter()
            .find(|e| e.title == payload.title && e.calendar_id == payload.calendar_id)
            .unwrap_or(CalendarEvent {
                id: uuid_like_id(),
                calendar_id: payload.calendar_id,
                title: payload.title,
                description: payload.description,
                location: payload.location,
                start_time: payload.start_time,
                end_time: payload.end_time,
                all_day: payload.all_day,
                meet_link: None,
                html_link: None,
                attendees: payload.attendees,
                status: Some("confirmed".to_string()),
                color: None,
            });

        Ok(created)
    }

    pub async fn update_event(&self, payload: UpdateEventPayload) -> Result<CalendarEvent> {
        let token = self.get_valid_access_token().await?;

        let mut body = serde_json::json!({
            "summary": payload.title,
            "description": payload.description.unwrap_or_default(),
            "location": payload.location.unwrap_or_default(),
        });

        if payload.all_day {
            body["start"] = serde_json::json!({
                "date": payload.start_time,
                "dateTime": serde_json::Value::Null
            });
            body["end"] = serde_json::json!({
                "date": payload.end_time,
                "dateTime": serde_json::Value::Null
            });
        } else {
            body["start"] = serde_json::json!({
                "dateTime": payload.start_time,
                "date": serde_json::Value::Null
            });
            body["end"] = serde_json::json!({
                "dateTime": payload.end_time,
                "date": serde_json::Value::Null
            });
        }

        if !payload.attendees.is_empty() {
            let atts: Vec<_> = payload
                .attendees
                .iter()
                .map(|email| serde_json::json!({ "email": email }))
                .collect();
            body["attendees"] = serde_json::Value::Array(atts);
        }

        let encoded_cal_id = urlencoding::encode(&payload.calendar_id);
        let encoded_ev_id = urlencoding::encode(&payload.event_id);
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/{}/events/{}",
            encoded_cal_id, encoded_ev_id
        );

        let res = self
            .client
            .patch(&url)
            .bearer_auth(&token)
            .json(&body)
            .send()
            .await
            .context("Failed to patch event on Google Calendar")?;

        if !res.status().is_success() {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to update event: {}", err_text));
        }

        self.sync().await?;

        let state = self.get_state().await;
        let updated = state
            .events
            .into_iter()
            .find(|e| e.id == payload.event_id)
            .ok_or_else(|| anyhow!("Event updated but not found in cache"))?;

        Ok(updated)
    }

    pub async fn delete_event(&self, calendar_id: &str, event_id: &str) -> Result<()> {
        let token = self.get_valid_access_token().await?;

        let encoded_cal_id = urlencoding::encode(calendar_id);
        let encoded_ev_id = urlencoding::encode(event_id);
        let url = format!(
            "https://www.googleapis.com/calendar/v3/calendars/{}/events/{}",
            encoded_cal_id, encoded_ev_id
        );

        let res = self
            .client
            .delete(&url)
            .bearer_auth(&token)
            .send()
            .await
            .context("Failed to delete event on Google Calendar")?;

        if !res.status().is_success() && res.status().as_u16() != 404 && res.status().as_u16() != 410 {
            let err_text = res.text().await.unwrap_or_default();
            return Err(anyhow!("Failed to delete event: {}", err_text));
        }

        // Optimistically remove from cache
        {
            let mut cache = self.cache.lock().await;
            cache.events.retain(|e| e.id != event_id);
            self.persist_cache(&cache)?;
        }

        Ok(())
    }
}

fn uuid_like_id() -> String {
    format!("{:x}", Utc::now().timestamp_nanos_opt().unwrap_or(0))
}

// -----------------------------------------------------------------------------
// OAuth Desktop Flow
// -----------------------------------------------------------------------------

#[tauri::command]
pub async fn calendar_start_auth(
    client_id: Option<String>,
    client_secret: Option<String>,
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarCacheData, String> {
    let resolved_client_id = client_id
        .filter(|s| !s.trim().is_empty())
        .unwrap_or_else(|| DEFAULT_CLIENT_ID.to_string());

    // Bind an ephemeral TCP listener on 127.0.0.1
    let listener = TcpListener::bind("127.0.0.1:0")
        .map_err(|e| format!("Failed to start local OAuth listener: {}", e))?;
    let port = listener
        .local_addr()
        .map_err(|e| format!("Failed to get listener port: {}", e))?
        .port();

    let redirect_uri = format!("http://127.0.0.1:{}/callback", port);

    let auth_url = format!(
        "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope={}&access_type=offline&prompt=consent",
        urlencoding::encode(&resolved_client_id),
        urlencoding::encode(&redirect_uri),
        urlencoding::encode("https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile")
    );

    // Open browser to auth URL
    let _ = open::that(&auth_url);

    let html_success = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Scratch — Google Calendar Connected</title>
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
    <h1>Connected to Google Calendar</h1>
    <p>You can close this window and return to Scratch.</p>
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

    // Loop and accept connections (handles favicon, preflight, etc.)
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
                return Err(format!("Google login error: {}", err_desc));
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

    let token_res = manager
        .client
        .post("https://oauth2.googleapis.com/token")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(form_body)
        .send()
        .await
        .map_err(|e| format!("Failed to exchange token with Google: {}", e))?;

    if !token_res.status().is_success() {
        let err_text = token_res.text().await.unwrap_or_default();
        if err_text.contains("client_secret is missing") {
            return Err("Google requires your OAuth Client Secret for this client. Please enter your Client Secret (starts with GOCSPX-...) in Scratch Settings > Integrations.".to_string());
        }
        return Err(format!("Token exchange failed: {}", err_text));
    }

    #[derive(Deserialize)]
    struct TokenExchangeResponse {
        access_token: String,
        refresh_token: Option<String>,
        expires_in: i64,
    }

    let token_data: TokenExchangeResponse = token_res
        .json()
        .await
        .map_err(|e| format!("Failed to parse token exchange response: {}", e))?;

    let existing_refresh = {
        let guard = manager.auth.lock().await;
        guard.as_ref().and_then(|a| if a.refresh_token.is_empty() { None } else { Some(a.refresh_token.clone()) })
    };

    let refresh_token = token_data
        .refresh_token
        .or(existing_refresh)
        .ok_or_else(|| "Google did not provide a refresh token. Please remove Scratch from your Google Account permissions and reconnect to re-issue consent.".to_string())?;

    // Fetch user profile / email
    let user_info_res = manager
        .client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
        .bearer_auth(&token_data.access_token)
        .send()
        .await;

    let (user_email, user_name) = match user_info_res {
        Ok(res) if res.status().is_success() => {
            #[derive(Deserialize)]
            struct UserInfo {
                email: Option<String>,
                name: Option<String>,
            }
            if let Ok(info) = res.json::<UserInfo>().await {
                (info.email, info.name)
            } else {
                (None, None)
            }
        }
        _ => (None, None),
    };

    let auth_entry = GoogleCalendarAuth {
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
        *auth_guard = Some(auth_entry.clone());
        manager
            .persist_auth(&Some(auth_entry))
            .map_err(|e| format!("Failed to persist auth data: {}", e))?;
    }

    // Trigger initial sync immediately
    manager
        .sync()
        .await
        .map_err(|e| format!("Initial sync error: {}", e))
}

#[tauri::command]
pub async fn calendar_get_state(
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarCacheData, String> {
    Ok(manager.get_state().await)
}

#[tauri::command]
pub async fn calendar_sync(
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarCacheData, String> {
    manager.sync().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn calendar_disconnect(
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<(), String> {
    manager.disconnect().await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn calendar_toggle_visibility(
    calendar_id: String,
    selected: bool,
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarCacheData, String> {
    manager
        .toggle_calendar_visibility(&calendar_id, selected)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn calendar_create_event(
    payload: CreateEventPayload,
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarEvent, String> {
    manager.create_event(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn calendar_update_event(
    payload: UpdateEventPayload,
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<CalendarEvent, String> {
    manager.update_event(payload).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn calendar_delete_event(
    calendar_id: String,
    event_id: String,
    manager: State<'_, Arc<CalendarManager>>,
) -> Result<(), String> {
    manager
        .delete_event(&calendar_id, &event_id)
        .await
        .map_err(|e| e.to_string())
}
