// iCloud Drive integration (macOS only).
//
// Scratch doesn't have CloudKit entitlements since it isn't a native Swift app,
// so "iCloud support" here means storing the notes folder inside the user's
// iCloud Drive container and letting macOS's iCloud daemon (bird/brctl) sync it,
// the same approach apps like Obsidian use. Every function below is a no-op /
// returns "unavailable" on non-macOS targets so the rest of the app can call
// these unconditionally.

use std::path::{Path, PathBuf};

const DEFAULT_SUBFOLDER: &str = "Scratch";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IcloudStatus {
    pub available: bool,
    pub container_path: Option<String>,
    pub default_folder_path: Option<String>,
}

/// Resolve the iCloud Drive container directory for the current user, if iCloud
/// Drive is enabled and the container exists on disk.
#[cfg(target_os = "macos")]
pub fn container_dir() -> Option<PathBuf> {
    let home = std::env::var("HOME").ok()?;
    let container = PathBuf::from(home).join("Library/Mobile Documents/com~apple~CloudDocs");
    if container.is_dir() {
        Some(container)
    } else {
        None
    }
}

#[cfg(not(target_os = "macos"))]
pub fn container_dir() -> Option<PathBuf> {
    None
}

pub fn get_status() -> IcloudStatus {
    match container_dir() {
        Some(container) => IcloudStatus {
            available: true,
            default_folder_path: Some(
                container
                    .join(DEFAULT_SUBFOLDER)
                    .to_string_lossy()
                    .into_owned(),
            ),
            container_path: Some(container.to_string_lossy().into_owned()),
        },
        None => IcloudStatus {
            available: false,
            container_path: None,
            default_folder_path: None,
        },
    }
}

/// Whether `path` lives inside the iCloud Drive container.
pub fn is_inside_icloud(path: &Path) -> bool {
    let Some(container) = container_dir() else {
        return false;
    };
    let canon_container = container.canonicalize().unwrap_or(container);
    let canon_path = path.canonicalize().unwrap_or_else(|_| path.to_path_buf());
    canon_path.starts_with(canon_container)
}

/// Create (if needed) and return the default `Scratch` folder inside the iCloud
/// Drive container.
pub fn ensure_default_folder() -> Result<PathBuf, String> {
    let container = container_dir().ok_or("iCloud Drive is not available on this Mac")?;
    let folder = container.join(DEFAULT_SUBFOLDER);
    std::fs::create_dir_all(&folder)
        .map_err(|e| format!("Failed to create iCloud folder: {}", e))?;
    Ok(folder)
}

/// True if `path` is itself an iCloud placeholder sentinel file
/// (e.g. `.Todo.md.icloud`), meaning the real file hasn't downloaded yet.
pub fn is_placeholder(path: &Path) -> bool {
    path.extension().and_then(|e| e.to_str()) == Some("icloud")
}

/// Path of the iCloud placeholder sentinel file for a given real file path,
/// e.g. `/notes/Todo.md` -> `/notes/.Todo.md.icloud`.
pub fn placeholder_path(real_file: &Path) -> Option<PathBuf> {
    let parent = real_file.parent()?;
    let file_name = real_file.file_name()?.to_str()?;
    Some(parent.join(format!(".{}.icloud", file_name)))
}

/// Recover the real file name from a placeholder path,
/// e.g. `.Todo.md.icloud` -> `Todo.md`.
pub fn real_name_from_placeholder(placeholder: &Path) -> Option<String> {
    let name = placeholder.file_name()?.to_str()?;
    let without_ext = name.strip_suffix(".icloud")?;
    without_ext.strip_prefix('.').map(|s| s.to_string())
}

/// Ask macOS's iCloud daemon to materialize (download) a file. Fire-and-forget:
/// spawns `brctl download` on a background thread and does not wait for it to
/// finish — the file watcher picks up the resulting write once it lands.
#[cfg(target_os = "macos")]
pub fn trigger_download(real_file: &Path) {
    let path = real_file.to_path_buf();
    std::thread::spawn(move || {
        let _ = std::process::Command::new("brctl")
            .arg("download")
            .arg(&path)
            .output();
    });
}

#[cfg(not(target_os = "macos"))]
pub fn trigger_download(_real_file: &Path) {}
