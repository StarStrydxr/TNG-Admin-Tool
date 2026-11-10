//! Markdown export: the user's template overrides, and writing the finished files.
//!
//! Default templates are bundled into the frontend at build time, the same bargain canon
//! tables make (CLAUDE.md §5). What lives here is the editable layer:
//!
//!   %APPDATA%\jjk-rp-vault\templates\<kind>.md   overrides the bundled default
//!   %APPDATA%\jjk-rp-vault\exports\…             where finished files land
//!
//! Dan will specify the export formats later (CLAUDE.md §11, phase 2.4), so being able to edit
//! a template in Notepad without a rebuild is the whole point of this module.

use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;
use tauri::AppHandle;

use crate::vault::{app_root, open_in_explorer};

const MAX_STEM_LEN: usize = 80;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTemplate {
    /// File stem, which is the entity kind the template is for.
    pub name: String,
    pub content: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserTemplates {
    pub templates: Vec<UserTemplate>,
    pub skipped: Vec<crate::vault::SkippedFile>,
    pub directory: String,
}

fn templates_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_root(app)?.join("templates");
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir)
}

fn exports_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app_root(app)?.join("exports");
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
    Ok(dir)
}

/// Export file names are built from a record's title, so unlike ids they need sanitising
/// rather than a whitelist. Returns a stem that is safe on Windows.
fn safe_stem(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .map(|c| {
            if matches!(c, '<' | '>' | ':' | '"' | '|' | '?' | '*' | '/' | '\\')
                || (c as u32) < 0x20
            {
                '-'
            } else {
                c
            }
        })
        .collect();

    let trimmed = cleaned.trim().trim_end_matches('.').trim();

    let mut stem: String = trimmed.chars().take(MAX_STEM_LEN).collect();
    stem = stem.trim().trim_end_matches('.').trim().to_string();

    // Reserved device names on Windows are refused by the filesystem whatever the extension.
    const RESERVED: [&str; 22] = [
        "CON", "PRN", "AUX", "NUL", "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7",
        "COM8", "COM9", "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    ];
    if stem.is_empty() || RESERVED.contains(&stem.to_ascii_uppercase().as_str()) {
        return format!("export-{stem}").trim_end_matches('-').to_string();
    }

    stem
}

/// Load the user's template overrides. A directory with nothing in it is the normal case.
pub fn load_user_templates(app: &AppHandle) -> Result<UserTemplates, String> {
    let dir = templates_dir(app)?;
    let mut templates = Vec::new();
    let mut skipped = Vec::new();

    let entries =
        fs::read_dir(&dir).map_err(|e| format!("Could not read {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }

        let name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string();

        match fs::read_to_string(&path) {
            Ok(content) => templates.push(UserTemplate { name, content }),
            Err(e) => skipped.push(crate::vault::SkippedFile {
                file: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                reason: e.to_string(),
            }),
        }
    }

    templates.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(UserTemplates {
        templates,
        skipped,
        directory: dir.to_string_lossy().to_string(),
    })
}

/// Write one template to the override folder, so the in-app editor and Notepad agree.
pub fn save_user_template(app: &AppHandle, name: &str, content: &str) -> Result<(), String> {
    let stem = safe_stem(name);
    let path = templates_dir(app)?.join(format!("{stem}.md"));
    fs::write(&path, content).map_err(|e| format!("Could not write {}: {e}", path.display()))
}

/// Remove an override, falling the app back to the bundled default. Already gone is success.
pub fn delete_user_template(app: &AppHandle, name: &str) -> Result<(), String> {
    let stem = safe_stem(name);
    let path = templates_dir(app)?.join(format!("{stem}.md"));
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(format!("Could not delete {stem}.md: {e}")),
    }
}

/// Where exports go when the user has nominated a folder of their own.
///
/// This is how a GM exports straight into a shared folder instead of fishing files out of
/// `%APPDATA%`. It must be an absolute path — a relative one would resolve against whatever
/// directory the app happened to start in, which is nobody's intent. It is created if missing.
///
/// Note what this is *not*: a sandbox escape worth worrying about. The user typed the path,
/// the app is single-user and local, and the only thing written is their own markdown.
fn destination_dir(app: &AppHandle, destination: &str) -> Result<PathBuf, String> {
    let trimmed = destination.trim();
    if trimmed.is_empty() {
        return exports_dir(app);
    }

    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(format!(
            "The export folder must be a full path, starting with a drive letter: got '{trimmed}'"
        ));
    }

    fs::create_dir_all(&path)
        .map_err(|e| format!("Could not use {}: {e}", path.display()))?;
    Ok(path)
}

/// Write a finished export. `folder` mirrors the record's own folder so exports organise
/// themselves the way the vault does. Returns the full path, to show the user.
pub fn write_export(
    app: &AppHandle,
    folder: &str,
    stem: &str,
    content: &str,
    destination: &str,
) -> Result<String, String> {
    let mut dir = destination_dir(app, destination)?;
    for segment in crate::vault::validate_folder(folder)? {
        dir.push(segment);
    }
    fs::create_dir_all(&dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;

    let path = dir.join(format!("{}.md", safe_stem(stem)));
    fs::write(&path, content).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(path.to_string_lossy().to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FoundNote {
    /// Path relative to the folder that was read, for reporting.
    pub path: String,
    pub content: String,
}

/// How many markdown files one import will read. A guard against someone pointing this at a
/// whole drive, not a judgement about vault size.
const MAX_NOTES: usize = 5000;
/// Deep enough for any sane vault, shallow enough to stop a symlink loop mattering.
const MAX_DEPTH: usize = 8;

fn collect_notes(
    dir: &Path,
    base: &Path,
    depth: usize,
    out: &mut Vec<FoundNote>,
) -> Result<(), String> {
    if depth > MAX_DEPTH || out.len() >= MAX_NOTES {
        return Ok(());
    }

    let entries =
        fs::read_dir(dir).map_err(|e| format!("Could not read {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        if out.len() >= MAX_NOTES {
            break;
        }

        let path = entry.path();
        let Ok(file_type) = entry.file_type() else {
            continue;
        };

        // Symlinks are skipped rather than followed: a vault is the user's own folder, and a
        // loop or a link out of it is not worth the risk of walking.
        if file_type.is_symlink() {
            continue;
        }

        if file_type.is_dir() {
            // Obsidian's own folder holds workspace state, not notes.
            if entry.file_name() == ".obsidian" {
                continue;
            }
            collect_notes(&path, base, depth + 1, out)?;
        } else if path.extension().and_then(|e| e.to_str()) == Some("md") {
            match fs::read_to_string(&path) {
                Ok(content) => out.push(FoundNote {
                    path: path
                        .strip_prefix(base)
                        .unwrap_or(&path)
                        .to_string_lossy()
                        .replace('\\', "/"),
                    content,
                }),
                // One unreadable file should not fail the whole import.
                Err(_) => continue,
            }
        }
    }

    Ok(())
}

/// Read every markdown file under a folder — an Obsidian vault, or any folder of notes.
///
/// Works against any absolute path, which is what makes a Drive- or OneDrive-synced folder
/// work with no network code in the app: those clients keep a local folder in sync, and this
/// reads the local folder like any other.
pub fn read_notes(dir: &str) -> Result<Vec<FoundNote>, String> {
    let trimmed = dir.trim();
    if trimmed.is_empty() {
        return Err("Choose a folder to import from".to_string());
    }

    let path = PathBuf::from(trimmed);
    if !path.is_absolute() {
        return Err(format!(
            "The import folder must be a full path, starting with a drive letter: got '{trimmed}'"
        ));
    }
    if !path.is_dir() {
        return Err(format!("There is no folder at {}", path.display()));
    }

    let mut out = Vec::new();
    collect_notes(&path, &path, 0, &mut out)?;
    Ok(out)
}

pub fn reveal_templates(app: &AppHandle) -> Result<(), String> {
    let dir = templates_dir(app)?;
    open_in_explorer(&dir)
}

pub fn reveal_exports(app: &AppHandle, destination: &str) -> Result<(), String> {
    let dir = destination_dir(app, destination)?;
    open_in_explorer(&dir)
}

#[cfg(test)]
mod tests {
    use super::safe_stem;

    #[test]
    fn strips_characters_windows_refuses() {
        assert_eq!(safe_stem("Arc 2: Shibuya"), "Arc 2- Shibuya");
        assert_eq!(safe_stem("a/b\\c"), "a-b-c");
        assert_eq!(safe_stem("what?*"), "what--");
    }

    #[test]
    fn trims_trailing_dots_and_spaces() {
        assert_eq!(safe_stem("  name.  "), "name");
        assert_eq!(safe_stem("name..."), "name");
    }

    #[test]
    fn never_returns_an_empty_or_reserved_name() {
        assert_eq!(safe_stem(""), "export");
        assert_eq!(safe_stem("   "), "export");
        assert_eq!(safe_stem("con"), "export-con");
        assert_eq!(safe_stem("NUL"), "export-NUL");
    }

    #[test]
    fn caps_the_length() {
        let long = "x".repeat(200);
        assert_eq!(safe_stem(&long).chars().count(), 80);
    }

    #[test]
    fn keeps_ordinary_names_intact() {
        assert_eq!(safe_stem("Walker Masami"), "Walker Masami");
        assert_eq!(safe_stem("Exorcism — Nakano depot"), "Exorcism — Nakano depot");
    }
}
