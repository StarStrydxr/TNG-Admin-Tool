// Hide the console window in release builds. Windows-only attribute, harmless elsewhere.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    jjk_rp_vault_lib::run()
}
