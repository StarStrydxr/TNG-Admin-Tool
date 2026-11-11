//! Vault storage: records as JSON files on disk, organised in folders.
//!
//! Records are handled as opaque `serde_json::Value`. The schemas live in TypeScript
//! (`src/domain/`) and are the single source of truth — duplicating them here would give us
//! two definitions to keep in step. Rust's job is paths, I/O and safety.
//!
//! Layout, per CLAUDE.md §3:
//!   %APPDATA%\jjk-rp-vault\vault\<collection>\<folder…>\<id>.json
//!
//! Subdirectories are real and user-facing: the folder shown in the app is the folder on disk,
//! so reorganising in Explorer and reorganising in the app are the same act.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::{AppHandle, Manager};

/// The data folder, deliberately NOT renamed with the app.
///
/// The product became "The Next Generation - GM and Admin Tool" at v0.3.0; this did not move.
/// Renaming it would orphan every character, record, table, template and backup already on
/// disk. A rename here is a migration, not a string change — see CLAUDE.md §3.
const APP_FOLDER: &str = "jjk-rp-vault";
const MAX_ID_LEN: usize = 64;
const MAX_FOLDER_DEPTH: usize = 8;
const MAX_SEGMENT_LEN: usize = 64;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkippedFile {
    pub file: String,
    pub reason: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultRecord {
    /// Path relative to the collection root, forward-slashed. Empty at the root.
    pub folder: String,
    pub file: String,
    pub content: serde_json::Value,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VaultListing {
    pub records: Vec<VaultRecord>,
    /// Files that could not be read or parsed. Surfaced in the UI; never fatal.
    pub skipped: Vec<SkippedFile>,
    pub directory: String,
}

/// The only collections that exist. Anything else is rejected before touching the filesystem.
fn collection_folder(kind: &str) -> Result<&'static str, String> {
    match kind {
        "characters" => Ok("characters"),
        "npcs" => Ok("npcs"),
        "missions" => Ok("missions"),
        "curses" => Ok("curses"),
        "cursed-objects" => Ok("cursed-objects"),
        "cursed-tools" => Ok("cursed-tools"),
        "techniques" => Ok("techniques"),
        "shikigami" => Ok("shikigami"),
        "lore" => Ok("lore"),
        "clans" => Ok("clans"),
        "bounties" => Ok("bounties"),
        "traits" => Ok("traits"),
        "defects" => Ok("defects"),
        other => Err(format!("Unknown vault collection: {other}")),
    }
}

/// Ids are generated as UUIDs, so this is a tight whitelist rather than a sanitiser.
fn validate_id(id: &str) -> Result<(), String> {
    if id.is_empty() || id.len() > MAX_ID_LEN {
        return Err("Record id must be between 1 and 64 characters".to_string());
    }
    if !id
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("Record id may only contain letters, digits, hyphens and underscores".into());
    }
    Ok(())
}

/// Folders are user-typed, so this is the real guard against escaping the collection.
///
/// Public because the export folder mirrors the vault's folders and must be guarded the same
/// way — one implementation, not two that can drift apart.
pub fn validate_folder(folder: &str) -> Result<Vec<String>, String> {
    if folder.trim().is_empty() {
        return Ok(Vec::new());
    }

    let segments: Vec<String> = folder
        .replace('\\', "/")
        .split('/')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    if segments.len() > MAX_FOLDER_DEPTH {
        return Err(format!("Folders may be at most {MAX_FOLDER_DEPTH} deep"));
    }

    for segment in &segments {
        if segment == "." || segment == ".." {
            return Err("Folder names cannot be '.' or '..'".to_string());
        }
        if segment.len() > MAX_SEGMENT_LEN {
            return Err("Folder names must be 64 characters or fewer".to_string());
        }
        if segment.ends_with(' ') || segment.ends_with('.') {
            return Err("Folder names cannot end with a space or a dot".to_string());
        }
        if segment.chars().any(|c| {
            matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*' | '/' | '\\') || (c as u32) < 0x20
        }) {
            return Err(format!("Folder name '{segment}' contains an illegal character"));
        }
    }

    Ok(segments)
}

/// `%APPDATA%\jjk-rp-vault` — the roaming data root, matching what CLAUDE.md documents.
pub fn app_root(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .data_dir()
        .map_err(|e| format!("Could not locate the user data directory: {e}"))?;
    Ok(base.join(APP_FOLDER))
}

fn collection_dir(app: &AppHandle, kind: &str) -> Result<PathBuf, String> {
    let dir = app_root(app)?.join("vault").join(collection_folder(kind)?);
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir)
}

fn record_path(app: &AppHandle, kind: &str, id: &str, folder: &str) -> Result<PathBuf, String> {
    validate_id(id)?;
    let mut path = collection_dir(app, kind)?;
    for segment in validate_folder(folder)? {
        path.push(segment);
    }
    Ok(path.join(format!("{id}.json")))
}

fn read_record(path: &Path) -> Result<serde_json::Value, String> {
    let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&text).map_err(|e| e.to_string())
}

fn walk(
    dir: &Path,
    root: &Path,
    records: &mut Vec<VaultRecord>,
    skipped: &mut Vec<SkippedFile>,
) -> Result<(), String> {
    let entries =
        fs::read_dir(dir).map_err(|e| format!("Could not read {}: {e}", dir.display()))?;

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
        if path.is_dir() {
            walk(&path, root, records, skipped)?;
            continue;
        }
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let file = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("<unnamed>")
            .to_string();

        let folder = path
            .parent()
            .and_then(|p| p.strip_prefix(root).ok())
            .map(|p| p.to_string_lossy().replace('\\', "/"))
            .unwrap_or_default();

        // A single corrupt file must not blank the collection — skip it and report it.
        match read_record(&path) {
            Ok(content) => records.push(VaultRecord { folder, file, content }),
            Err(reason) => skipped.push(SkippedFile { file, reason }),
        }
    }

    Ok(())
}

pub fn list(app: &AppHandle, kind: &str) -> Result<VaultListing, String> {
    let dir = collection_dir(app, kind)?;
    let mut records = Vec::new();
    let mut skipped = Vec::new();
    walk(&dir, &dir, &mut records, &mut skipped)?;

    // Stable order regardless of filesystem enumeration.
    records.sort_by(|a, b| (&a.folder, &a.file).cmp(&(&b.folder, &b.file)));

    Ok(VaultListing {
        records,
        skipped,
        directory: dir.to_string_lossy().to_string(),
    })
}

/// Remove any copy of this id sitting in a different folder, so saving after a folder change
/// moves the record rather than duplicating it.
fn remove_strays(dir: &Path, id: &str, keep: &Path) -> Result<(), String> {
    let target = format!("{id}.json");
    let entries = match fs::read_dir(dir) {
        Ok(entries) => entries,
        Err(_) => return Ok(()),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            remove_strays(&path, id, keep)?;
        } else if path != keep && path.file_name().and_then(|n| n.to_str()) == Some(&target) {
            let _ = fs::remove_file(&path);
        }
    }
    Ok(())
}

/// Write via a temporary file and rename, so an interrupted save cannot truncate a good record.
pub fn save(
    app: &AppHandle,
    kind: &str,
    id: &str,
    folder: &str,
    data: &serde_json::Value,
) -> Result<(), String> {
    let path = record_path(app, kind, id, folder)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Could not create {}: {e}", parent.display()))?;
    }

    let tmp = path.with_extension("json.tmp");
    let text = serde_json::to_string_pretty(data)
        .map_err(|e| format!("Could not serialise the record: {e}"))?;

    fs::write(&tmp, text).map_err(|e| format!("Could not write {}: {e}", tmp.display()))?;
    fs::rename(&tmp, &path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        format!("Could not save {}: {e}", path.display())
    })?;

    remove_strays(&collection_dir(app, kind)?, id, &path)
}

pub fn delete(app: &AppHandle, kind: &str, id: &str, folder: &str) -> Result<(), String> {
    let path = record_path(app, kind, id, folder)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        // Already gone is the outcome the caller wanted.
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Could not delete {}: {e}", path.display())),
    }
}

/// Open the collection's folder in Explorer. The data is meant to be hand-editable, so the app
/// should be able to show the user where it lives.
pub fn reveal(app: &AppHandle, kind: &str) -> Result<(), String> {
    let dir = collection_dir(app, kind)?;
    open_in_explorer(&dir)
}

/// Show a folder to the user. Windows-only by design (CLAUDE.md §2 — one build target).
pub fn open_in_explorer(dir: &Path) -> Result<(), String> {
    std::process::Command::new("explorer")
        .arg(dir.as_os_str())
        .spawn()
        .map_err(|e| format!("Could not open the folder: {e}"))?;
    Ok(())
}
