use crate::models::{Email, EmailSummary};
use crate::services::{ImapService, SmtpService, StorageService};
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

// 简单的测试命令 - 用于验证 IPC 通信
#[tauri::command]
pub async fn test_connection(account_id: String, storage: StorageState<'_>) -> Result<String, String> {
    println!("[TEST] 测试连接命令被调用，account_id: {}", account_id);

    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    println!("[TEST] 找到账户: {}", account.email);

    Ok(format!("测试成功！账户: {}, IMAP服务器: {}:{}",
        account.email, account.imap_server, account.imap_port))
}

// 专门的调试命令 - 使用提供的邮箱进行测试
#[tauri::command]
pub async fn debug_fetch_emails() -> Result<String, String> {
    use crate::models::EmailAccount;
    use crate::services::ImapService;

    println!("[DEBUG] 开始调试邮件收取...");

    // 使用用户提供的邮箱信息
    let test_account = EmailAccount {
        id: "test-account".to_string(),
        email: "xiybhk@163.com".to_string(),
        password: "XX3U7edfkTFpGPXS".to_string(),
        imap_server: "imap.163.com".to_string(),
        imap_port: 993,
        smtp_server: "smtp.163.com".to_string(),
        smtp_port: 465,
        name: "测试账户".to_string(),
        is_default: false,
    };

    println!("[DEBUG] 创建测试账户: {}", test_account.email);

    let imap_service = ImapService::new(test_account);

    println!("[DEBUG] 使用imap库获取163邮箱邮件（已发送ID命令）...");
    let emails = imap_service.fetch_emails("INBOX", 10, 0).await?;
    println!("[DEBUG] 成功获取 {} 封邮件", emails.len());

    if emails.is_empty() {
        return Ok("INBOX 中没有邮件".to_string());
    }

    let first_email = &emails[0];
    println!("[DEBUG] 第一封邮件:");
    println!("[DEBUG]   主题: {}", first_email.subject);
    println!("[DEBUG]   发件人: {}", first_email.from);
    println!("[DEBUG]   UID: {}", first_email.uid);

    Ok(format!("成功！找到 {} 封邮件，已获取第一封邮件信息", emails.len()))
}

#[tauri::command]
pub async fn fetch_folders(account_id: String, storage: StorageState<'_>) -> Result<Vec<String>, String> {
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

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
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

    imap_service.fetch_emails(&folder, limit, offset).await
}

#[tauri::command]
pub async fn fetch_email_detail(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<Email, String> {
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

    imap_service.fetch_email_detail(&folder, uid).await
}

#[tauri::command]
pub async fn mark_email_read(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

    imap_service.mark_as_read(&folder, uid).await
}

#[tauri::command]
pub async fn delete_email(
    account_id: String,
    folder: String,
    uid: u32,
    storage: StorageState<'_>,
) -> Result<(), String> {
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

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
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let imap_service = ImapService::new(account);

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
    let account = storage.get_account(&account_id)?
        .ok_or("账户不存在")?;

    let smtp_service = SmtpService::new(account);

    smtp_service.send_email(to, &subject, &body, is_html)
}
