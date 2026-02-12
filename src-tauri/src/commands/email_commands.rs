use crate::models::{Email, EmailAccount, EmailSummary};
use crate::services::{ImapService, SmtpService, StorageService};
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

/// 获取账户和密码的辅助函数
fn get_account_with_password(
    storage: &StorageState<'_>,
    account_id: &str,
) -> Result<(EmailAccount, String), String> {
    let account = storage.get_account(account_id)?
        .ok_or("账户不存在")?;

    let password = storage.get_password(&account)?
        .ok_or("未找到账户密码，请重新添加账户")?;

    Ok((account, password))
}

#[tauri::command]
pub async fn fetch_folders(account_id: String, storage: StorageState<'_>) -> Result<Vec<String>, String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.list_folders().await
}

#[tauri::command]
pub async fn fetch_emails(
    account_id: String,
    folder: String,
    limit: usize,
    offset: usize,
    storage: StorageState<'_>,
) -> Result<Vec<EmailSummary>, String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.fetch_emails(&folder, limit, offset).await
}

#[tauri::command]
pub async fn fetch_email_detail(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<Email, String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.fetch_email_detail(&folder, uid).await
}

#[tauri::command]
pub async fn mark_email_read(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.mark_as_read(&folder, uid).await
}

#[tauri::command]
pub async fn delete_email(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.delete_email(&folder, uid).await
}

#[tauri::command]
pub async fn move_email(
    account_id: String,
    folder: String,
    uid: u32,
    dest_folder: String,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    imap_service.move_email(&folder, uid, &dest_folder).await
}

#[tauri::command]
pub async fn send_email(
    account_id: String,
    to: Vec<String>,
    subject: String,
    body: String,
    is_html: bool,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let smtp_service = SmtpService::new(account, password);

    smtp_service.send_email(to, &subject, &body, is_html)
}
