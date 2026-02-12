use crate::models::{EmailAccount, EmailAccountWithPassword};
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
    let account_with_pwd = match provider.as_str() {
        "163" => EmailAccountWithPassword::new_163(email, password, name),
        "qq" => EmailAccountWithPassword::new_qq(email, password, name),
        "gmail" => EmailAccountWithPassword::new_gmail(email, password, name),
        _ => return Err("不支持的邮箱服务商".to_string()),
    };

    let account_id = account_with_pwd.account.id.clone();

    // 保存账户信息（不包含密码）
    storage.save_account(&account_with_pwd.account)?;

    // 保存密码到系统密钥链
    storage.save_password(&account_with_pwd.account, &account_with_pwd.password)?;

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
pub async fn test_imap_connection(
    storage: StorageState<'_>,
    account: EmailAccount,
) -> Result<String, String> {
    // 从密钥链获取密码
    let password = storage.get_password(&account)?
        .ok_or("未找到账户密码，请重新添加账户")?;

    let imap_service = ImapService::new(account, password);

    let _client = imap_service.connect().await?;

    Ok("IMAP连接成功".to_string())
}

#[tauri::command]
pub async fn test_smtp_connection(
    storage: StorageState<'_>,
    account: EmailAccount,
) -> Result<String, String> {
    // 从密钥链获取密码
    let password = storage.get_password(&account)?
        .ok_or("未找到账户密码，请重新添加账户")?;

    let smtp_service = SmtpService::new(account, password);

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
