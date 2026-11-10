//! Tauri shell for the JJK RP Vault.
//!
//! Commands stay thin: validate, delegate to a module, return `Result<T, String>`.
//! Business logic does not live here. See CLAUDE.md §3 and §9.
//!
//! Modules still to come, each in its own phase:
//!   claude.rs  — spawns the `claude` CLI       (Phase 3)
//!   usage.rs   — the usage guard               (Phase 3)

mod backup;
mod config;
mod exports;
mod images;
mod tables;
mod vault;

use tauri::AppHandle;

/// Smoke test for the frontend/backend seam. The sidebar shows this on startup.
#[tauri::command]
fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn vault_list(app: AppHandle, kind: String) -> Result<vault::VaultListing, String> {
    vault::list(&app, &kind)
}

#[tauri::command]
fn vault_save(
    app: AppHandle,
    kind: String,
    id: String,
    folder: String,
    data: serde_json::Value,
) -> Result<(), String> {
    vault::save(&app, &kind, &id, &folder, &data)
}

#[tauri::command]
fn vault_delete(app: AppHandle, kind: String, id: String, folder: String) -> Result<(), String> {
    vault::delete(&app, &kind, &id, &folder)
}

#[tauri::command]
fn vault_reveal(app: AppHandle, kind: String) -> Result<(), String> {
    vault::reveal(&app, &kind)
}

#[tauri::command]
fn tables_list(app: AppHandle) -> Result<tables::UserTables, String> {
    tables::load_user_tables(&app)
}

#[tauri::command]
fn tables_save(app: AppHandle, name: String, content: String) -> Result<String, String> {
    tables::save(&app, &name, &content)
}

#[tauri::command]
fn tables_reveal(app: AppHandle) -> Result<(), String> {
    tables::reveal(&app)
}

#[tauri::command]
fn image_save(app: AppHandle, id: String, ext: String, bytes: Vec<u8>) -> Result<String, String> {
    images::save(&app, &id, &ext, bytes)
}

#[tauri::command]
fn image_load(app: AppHandle, name: String) -> Result<String, String> {
    images::load(&app, &name)
}

#[tauri::command]
fn image_delete(app: AppHandle, name: String) -> Result<(), String> {
    images::delete(&app, &name)
}

#[tauri::command]
fn image_list(app: AppHandle) -> Result<Vec<String>, String> {
    images::list(&app)
}

#[tauri::command]
fn image_reveal(app: AppHandle) -> Result<(), String> {
    images::reveal(&app)
}

#[tauri::command]
fn templates_list(app: AppHandle) -> Result<exports::UserTemplates, String> {
    exports::load_user_templates(&app)
}

#[tauri::command]
fn template_save(app: AppHandle, name: String, content: String) -> Result<(), String> {
    exports::save_user_template(&app, &name, &content)
}

#[tauri::command]
fn template_delete(app: AppHandle, name: String) -> Result<(), String> {
    exports::delete_user_template(&app, &name)
}

#[tauri::command]
fn templates_reveal(app: AppHandle) -> Result<(), String> {
    exports::reveal_templates(&app)
}

#[tauri::command]
fn export_write(
    app: AppHandle,
    folder: String,
    stem: String,
    content: String,
    destination: String,
) -> Result<String, String> {
    exports::write_export(&app, &folder, &stem, &content, &destination)
}

#[tauri::command]
fn exports_reveal(app: AppHandle, destination: String) -> Result<(), String> {
    exports::reveal_exports(&app, &destination)
}

#[tauri::command]
fn notes_read(dir: String) -> Result<Vec<exports::FoundNote>, String> {
    exports::read_notes(&dir)
}

#[tauri::command]
fn backup_create(app: AppHandle, stamp: String) -> Result<backup::BackupResult, String> {
    backup::create(&app, &stamp)
}

#[tauri::command]
fn backup_list(app: AppHandle) -> Result<Vec<backup::BackupEntry>, String> {
    backup::list(&app)
}

#[tauri::command]
fn backup_reveal(app: AppHandle) -> Result<(), String> {
    backup::reveal(&app)
}

#[tauri::command]
fn backup_restore(
    app: AppHandle,
    name: String,
    stamp: String,
) -> Result<backup::RestoreResult, String> {
    backup::restore(&app, &name, &stamp)
}

#[tauri::command]
fn config_load(app: AppHandle) -> Result<serde_json::Value, String> {
    config::load(&app)
}

#[tauri::command]
fn config_save(app: AppHandle, data: serde_json::Value) -> Result<(), String> {
    config::save(&app, &data)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            app_version,
            config_load,
            config_save,
            vault_list,
            vault_save,
            vault_delete,
            vault_reveal,
            tables_list,
            tables_save,
            tables_reveal,
            image_save,
            image_load,
            image_delete,
            image_list,
            image_reveal,
            templates_list,
            template_save,
            template_delete,
            templates_reveal,
            export_write,
            exports_reveal,
            notes_read,
            backup_create,
            backup_list,
            backup_reveal,
            backup_restore
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
