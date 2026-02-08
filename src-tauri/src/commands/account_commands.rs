use crate::models::EmailAccount;
use crate::services::{ImapService, SmtpService, StorageService};
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

#[tauri::command]
pub async fn add_account(
    storage: StorageState<'_>,
    email: String,
    password: String,
    name: String,
    provider: String,
) -> Result<String, String> {
    let account = match provider.as_str() {
        "163" => EmailAccount::new_163(email, password, name),
        "qq" => EmailAccount::new_qq(email, password, name),
        "gmail" => EmailAccount::new_gmail(email, password, name),
        _ => return Err("不支持的邮箱服务商".to_string()),
    };

    // 测试连接
    let imap_service = ImapService::new(account.clone());
    let smtp_service = SmtpService::new(account.clone());

    // 测试IMAP连接 - 直接调用测试
    imap_service.connect().await
        .map_err(|e| format!("IMAP连接测试失败: {}", e))?;

    // 测试SMTP连接
    smtp_service.test_connection()?;

    // 保存账户
    let account_id = account.id.clone();
    storage.save_account(&account)?;

    Ok(account_id)
}

#[tauri::command]
pub async fn list_accounts(storage: StorageState<'_>) -> Result<Vec<EmailAccount>, String> {
    storage.list_accounts()
}

#[tauri::command]
pub async fn delete_account(storage: StorageState<'_>, id: String) -> Result<(), String> {
    storage.delete_account(&id)
}

#[tauri::command]
pub async fn test_imap_connection(account: EmailAccount) -> Result<String, String> {
    let imap_service = ImapService::new(account);

    let _client = imap_service.connect().await?;

    Ok("IMAP连接成功".to_string())
}

#[tauri::command]
pub async fn test_smtp_connection(account: EmailAccount) -> Result<String, String> {
    let smtp_service = SmtpService::new(account);

    smtp_service.test_connection()?;

    Ok("SMTP连接成功".to_string())
}

#[tauri::command]
pub async fn get_default_account(storage: StorageState<'_>) -> Result<Option<EmailAccount>, String> {
    let config = storage.get_config()?;

    if let Some(default_id) = config.default_account_id {
        Ok(storage.get_account(&default_id)?)
    } else {
        let accounts = storage.list_accounts()?;
        Ok(accounts.first().cloned())
    }
}

#[tauri::command]
pub async fn set_default_account(
    storage: StorageState<'_>,
    id: String,
) -> Result<(), String> {
    let mut config = storage.get_config()?;
    config.default_account_id = Some(id);
    storage.save_config(&config)?;
    Ok(())
}
