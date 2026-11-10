//! Backups.
//!
//! There is no cloud and no sync, by design (CLAUDE.md §1), which means the folder under
//! `%APPDATA%` is the only copy of everything Dan has written. This makes a second one.
//!
//! A **dated folder copy**, not an archive. A zip would need either a crate or a hand-rolled
//! zip writer, and buys nothing here: a folder can be dragged onto a USB stick, opened in
//! Explorer, and restored by copying it back. Nothing to unpack and nothing to go wrong.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::AppHandle;

use crate::vault::{app_root, open_in_explorer};

/// Backups live inside the data folder, and are skipped when copying it — otherwise each one
/// would contain every one before it.
const BACKUPS_DIR: &str = "backups";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupResult {
    pub path: String,
    pub files: usize,
    pub bytes: u64,
}

fn backups_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_root(app)?.join(BACKUPS_DIR);
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Copy `from` into `to`, recursively. Returns (files, bytes).
fn copy_tree(from: &Path, to: &Path, skip: &Path) -> Result<(usize, u64), String> {
    fs::create_dir_all(to).map_err(|e| format!("Could not create {}: {e}", to.display()))?;

    let mut files = 0usize;
    let mut bytes = 0u64;

    let entries =
        fs::read_dir(from).map_err(|e| format!("Could not read {}: {e}", from.display()))?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if path == skip {
            continue;
        }

        let name = entry.file_name();
        let target = to.join(&name);

        let file_type = entry.file_type().map_err(|e| e.to_string())?;

        if file_type.is_dir() {
            let (f, b) = copy_tree(&path, &target, skip)?;
            files += f;
            bytes += b;
        } else if file_type.is_file() {
            let copied = fs::copy(&path, &target)
                .map_err(|e| format!("Could not copy {}: {e}", path.display()))?;
            files += 1;
            bytes += copied;
        }
        // Symlinks and anything else are skipped: nothing in this folder should be one, and
        // following one could walk somewhere surprising.
    }

    Ok((files, bytes))
}

/// `stamp` is the local date and time, formatted by the frontend — Rust has no clock here that
/// knows the user's timezone, and a backup named in UTC would confuse someone reading the list.
pub fn create(app: &AppHandle, stamp: &str) -> Result<BackupResult, String> {
    let safe: String = stamp
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_')
        .collect();
    if safe.is_empty() {
        return Err("The backup needs a name".to_string());
    }

    let root = app_root(app)?;
    let skip = root.join(BACKUPS_DIR);
    let mut target = backups_dir(app)?.join(format!("backup-{safe}"));

    // Two backups in the same minute should not merge into each other.
    let mut attempt = 2;
    while target.exists() {
        target = backups_dir(app)?.join(format!("backup-{safe}-{attempt}"));
        attempt += 1;
        if attempt > 50 {
            return Err("Too many backups with that timestamp".to_string());
        }
    }

    let (files, bytes) = copy_tree(&root, &target, &skip)?;

    Ok(BackupResult {
        path: target.to_string_lossy().to_string(),
        files,
        bytes,
    })
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
}

/// Existing backups, newest name first. Names sort chronologically because the stamp does.
pub fn list(app: &AppHandle) -> Result<Vec<BackupEntry>, String> {
    let dir = backups_dir(app)?;
    let mut out = Vec::new();

    let entries =
        fs::read_dir(&dir).map_err(|e| format!("Could not read {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        if entry.path().is_dir() {
            out.push(BackupEntry {
                name: entry.file_name().to_string_lossy().to_string(),
                path: entry.path().to_string_lossy().to_string(),
            });
        }
    }

    out.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(out)
}

pub fn reveal(app: &AppHandle) -> Result<(), String> {
    let dir = backups_dir(app)?;
    open_in_explorer(&dir)
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreResult {
    /// Where the pre-restore state was put, so the user can get back to it.
    pub safety_backup: String,
    pub files: usize,
}

/// Restore a backup over the live data folder.
///
/// Two rules make this safe enough to offer:
///
///   * **The current state is backed up first.** Restoring is destructive and someone will do
///     it by mistake; the way out is another backup, taken automatically, named so it is
///     obvious which one it is.
///   * **Live files are removed before the copy**, so a restore is the backup exactly, not the
///     backup merged over whatever is there. A half-restored vault would be worse than either.
///
/// `backups/` itself is never touched, so no backup can delete the others.
pub fn restore(app: &AppHandle, name: &str, stamp: &str) -> Result<RestoreResult, String> {
    let dir = backups_dir(app)?;

    // The name comes from our own listing, but it arrives over IPC, so treat it as input.
    if name.is_empty()
        || !name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err("That is not a backup name".to_string());
    }

    let source = dir.join(name);
    if !source.is_dir() {
        return Err(format!("There is no backup called {name}"));
    }

    // Take the safety copy before anything is removed.
    let safety = create(app, &format!("{stamp}-before-restore"))?;

    let root = app_root(app)?;
    let skip = dir;

    let entries =
        fs::read_dir(&root).map_err(|e| format!("Could not read {}: {e}", root.display()))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path == skip {
            continue;
        }

        let result = if path.is_dir() {
            fs::remove_dir_all(&path)
        } else {
            fs::remove_file(&path)
        };
        result.map_err(|e| {
            format!(
                "Could not clear {} before restoring: {e}. Your data is unchanged in {}",
                path.display(),
                safety.path
            )
        })?;
    }

    let (files, _) = copy_tree(&source, &root, &root.join(BACKUPS_DIR))?;

    Ok(RestoreResult {
        safety_backup: safety.path,
        files,
    })
}
