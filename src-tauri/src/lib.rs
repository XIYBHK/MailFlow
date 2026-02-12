// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 模块声明
pub mod models;
pub mod services;
mod commands;

use services::StorageService;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化存储服务
    let storage = StorageService::new()
        .expect("Failed to initialize storage service");
    let storage = Arc::new(storage);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(storage)
        .invoke_handler(tauri::generate_handler![
            // 账户管理命令
            commands::add_account,
            commands::list_accounts,
            commands::delete_account,
            commands::test_imap_connection,
            commands::test_smtp_connection,
            commands::get_default_account,
            commands::set_default_account,
            // 邮件操作命令
            commands::fetch_folders,
            commands::fetch_emails,
            commands::fetch_email_detail,
            commands::mark_email_read,
            commands::delete_email,
            commands::move_email,
            commands::send_email,
            // AI功能命令
            commands::classify_email_ai,
            commands::summarize_email,
            commands::translate_text,
            commands::generate_reply,
            commands::extract_key_info,
            commands::set_ai_api_key,
            commands::get_ai_config,
            // 配置管理命令
            commands::get_app_config,
            commands::update_app_config,
            commands::get_filter_rules,
            commands::save_filter_rule,
            commands::delete_filter_rule,
            commands::clear_email_cache,
            commands::export_data,
            commands::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
