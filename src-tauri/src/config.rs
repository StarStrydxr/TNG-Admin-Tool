//! `%APPDATA%\jjk-rp-vault\config.json`.
//!
//! Settings now; the Phase 3 usage-guard thresholds will share the same file as a separate
//! top-level key. As elsewhere, Rust treats the contents as opaque JSON — the shape lives in
//! `src/domain/settings.ts`.

use std::fs;
use std::path::PathBuf;

use tauri::AppHandle;

use crate::vault::app_root;

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let root = app_root(app)?;
    fs::create_dir_all(&root).map_err(|e| format!("Could not create {}: {e}", root.display()))?;
    Ok(root.join("config.json"))
}

/// `null` when there is no config yet — a first run is not an error.
pub fn load(app: &AppHandle) -> Result<serde_json::Value, String> {
    let path = config_path(app)?;
    if !path.exists() {
        return Ok(serde_json::Value::Null);
    }

    let text = fs::read_to_string(&path)
        .map_err(|e| format!("Could not read {}: {e}", path.display()))?;

    // A corrupt config must not block startup; the frontend falls back to defaults.
    Ok(serde_json::from_str(&text).unwrap_or(serde_json::Value::Null))
}

/// Temp-then-rename, so an interrupted write cannot leave a truncated config behind.
pub fn save(app: &AppHandle, data: &serde_json::Value) -> Result<(), String> {
    let path = config_path(app)?;
    let tmp = path.with_extension("json.tmp");

    let text = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Could not serialise settings: {e}"))?;

    fs::write(&tmp, text).map_err(|e| format!("Could not write {}: {e}", tmp.display()))?;
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Could not save {}: {e}", path.display())
    })
}
