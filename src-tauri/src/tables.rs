//! User table loading.
//!
//! Canon tables ship inside the frontend bundle (imported at build time from `data/canon`), so
//! Rust only deals with the user's own overlay in:
//!
//!   %APPDATA%\jjk-rp-vault\tables\*.json
//!
//! As with the vault, a file that will not parse is skipped and reported — never fatal.

use std::fs;
use std::path::PathBuf;

use serde::Serialize;
use tauri::AppHandle;

use crate::vault::{app_root, SkippedFile};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTableFile {
    pub file: String,
    pub content: serde_json::Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTables {
    pub files: Vec<UserTableFile>,
    pub skipped: Vec<SkippedFile>,
    pub directory: String,
}

fn tables_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_root(app)?.join("tables");
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir)
}

pub fn load_user_tables(app: &AppHandle) -> Result<UserTables, String> {
    let dir = tables_dir(app)?;
    let mut files = Vec::new();
    let mut skipped = Vec::new();

    let entries =
        fs::read_dir(&dir).map_err(|e| format!("Could not read {}: {e}", dir.display()))?;

    for entry in entries {
        let entry = match entry {
            Ok(entry) => entry,
            Err(e) => {
                skipped.push(SkippedFile {
                    file: "<unreadable entry>".to_string(),
                    reason: e.to_string(),
                });
                continue;
            }
        };

        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let name = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("<unnamed>")
            .to_string();

        let parsed = fs::read_to_string(&path)
            .map_err(|e| e.to_string())
            .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).map_err(|e| e.to_string()));

        match parsed {
            Ok(content) => files.push(UserTableFile { file: name, content }),
            Err(reason) => skipped.push(SkippedFile { file: name, reason }),
        }
    }

    // Deterministic merge order, so two runs with the same files produce the same table set.
    files.sort_by(|a, b| a.file.cmp(&b.file));

    Ok(UserTables {
        files,
        skipped,
        directory: dir.to_string_lossy().to_string(),
    })
}

/// Write one user table file.
///
/// User tables overlay canon and are never merged into it (CLAUDE.md §5), so this only ever
/// writes inside `%APPDATA%\jjk-rp-vault\tables`. The name is whitelisted rather than
/// sanitised, for the same reason image names are.
pub fn save(app: &AppHandle, name: &str, content: &str) -> Result<String, String> {
    if name.is_empty()
        || name.len() > 64
        || !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("A table file name may only contain letters, digits, - and _".to_string());
    }

    // Refuse to write anything that is not valid JSON: a broken user table degrades the app
    // to "this file was skipped", and writing one from here would be self-inflicted.
    serde_json::from_str::<serde_json::Value>(content)
        .map_err(|e| format!("That is not valid JSON: {e}"))?;

    let path = tables_dir(app)?.join(format!("{name}.json"));
    fs::write(&path, content).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().to_string())
}

/// Open the user table folder in Explorer, so entries can be added by hand.
pub fn reveal(app: &AppHandle) -> Result<(), String> {
    let dir = tables_dir(app)?;
    crate::vault::open_in_explorer(&dir)
}
