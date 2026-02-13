use crate::models::{AppConfig, FilterRule};
use crate::services::StorageService;
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

#[tauri::command]
pub async fn get_app_config(storage: StorageState<'_>) -> Result<AppConfig, String> {
    storage.get_config()
}

#[tauri::command]
pub async fn update_app_config(
    config: AppConfig,
    storage: StorageState<'_>,
) -> Result<(), String> {
    storage.save_config(&config)
}

#[tauri::command]
pub async fn get_filter_rules(storage: StorageState<'_>) -> Result<Vec<FilterRule>, String> {
    storage.get_filter_rules()
}

#[tauri::command]
pub async fn save_filter_rule(
    rule: FilterRule,
    storage: StorageState<'_>,
) -> Result<(), String> {
    storage.save_filter_rule(&rule)
}

#[tauri::command]
pub async fn delete_filter_rule(
    id: String,
    storage: StorageState<'_>,
) -> Result<(), String> {
    storage.delete_filter_rule(&id)
}

#[tauri::command]
pub async fn clear_email_cache(
    account_id: String,
    folder: String,
    storage: StorageState<'_>,
) -> Result<(), String> {
    storage.clear_all_cache(&account_id, &folder)
}

#[tauri::command]
pub async fn export_data(storage: StorageState<'_>) -> Result<String, String> {
    // 导出数据到JSON文件
    let config = storage.get_config()?;
    let accounts = storage.list_accounts()?;
    let rules = storage.get_filter_rules()?;

    let export_data = serde_json::json!({
        "config": config,
        "accounts": accounts,
        "filter_rules": rules,
        "exported_at": chrono::Utc::now().to_rfc3339()
    });

    let export_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("email-client")
        .join("exports");

    std::fs::create_dir_all(&export_dir)
        .map_err(|e| format!("创建导出目录失败: {}", e))?;

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let file_path = export_dir.join(format!("backup_{}.json", timestamp));

    std::fs::write(&file_path, export_data.to_string())
        .map_err(|e| format!("写入导出文件失败: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn import_data(
    file_path: String,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let content = std::fs::read_to_string(&file_path)
        .map_err(|e| format!("读取导入文件失败: {}", e))?;

    let import_data: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("解析导入文件失败: {}", e))?;

    // 导入配置
    if let Some(config) = import_data.get("config") {
        let config: AppConfig = serde_json::from_value(config.clone())
            .map_err(|e| format!("解析配置失败: {}", e))?;
        storage.save_config(&config)?;
    }

    // 导入账户
    if let Some(accounts) = import_data.get("accounts") {
        let accounts: Vec<crate::models::EmailAccount> = serde_json::from_value(accounts.clone())
            .map_err(|e| format!("解析账户失败: {}", e))?;
        for account in accounts {
            storage.save_account(&account)?;
        }
    }

    // 导入规则
    if let Some(rules) = import_data.get("filter_rules") {
        let rules: Vec<FilterRule> = serde_json::from_value(rules.clone())
            .map_err(|e| format!("解析规则失败: {}", e))?;
        for rule in rules {
            storage.save_filter_rule(&rule)?;
        }
    }

    Ok(())
}
