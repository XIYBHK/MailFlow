use crate::models::{Email, EmailAccount, EmailSummary, FolderSyncState};
use crate::services::{ImapService, SmtpService, StorageService};
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

/// 缓存有效期（秒）- 5分钟
const CACHE_TTL_SECONDS: i64 = 300;

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
    force_refresh: Option<bool>,
    storage: StorageState<'_>,
) -> Result<Vec<EmailSummary>, String> {
    let force = force_refresh.unwrap_or(false);
    let now = chrono::Utc::now().timestamp();

    // 1. 检查本地缓存（非强制刷新时）
    if !force {
        if let Some(cached) = storage.get_cached_email_summaries(&account_id, &folder)? {
            // 检查缓存是否过期
            if now - cached.last_updated < CACHE_TTL_SECONDS {
                // 缓存有效，直接返回
                let emails: Vec<EmailSummary> = cached.emails
                    .into_iter()
                    .skip(offset)
                    .take(limit)
                    .collect();
                if !emails.is_empty() {
                    return Ok(emails);
                }
            }
        }
    }

    let (account, password) = get_account_with_password(&storage, &account_id)?;
    let imap_service = ImapService::new(account.clone(), password);

    // 2. 检查同步状态
    let sync_state = storage.get_folder_sync_state(&account_id, &folder)?;

    // 3. 获取当前文件夹状态
    let (uid_validity, uid_next) = imap_service.get_folder_status(&folder).await?;

    // 4. 判断是否需要全量同步
    let need_full_sync = force || sync_state.is_none() ||
        sync_state.as_ref().map(|s| s.uid_validity) != Some(uid_validity);

    let emails = if need_full_sync {
        // 全量同步
        let fetched_emails = imap_service.fetch_emails(&folder, limit, offset).await?;

        // 缓存结果
        storage.cache_email_summaries(&account_id, &folder, &fetched_emails)?;

        // 更新同步状态
        let last_uid = fetched_emails.first().map(|e| e.uid).unwrap_or(0);
        let state = FolderSyncState {
            account_id: account_id.clone(),
            folder: folder.clone(),
            last_uid,
            uid_validity,
            last_sync_time: now,
        };
        storage.save_folder_sync_state(&state)?;

        fetched_emails
    } else {
        // 增量同步
        let state = sync_state.unwrap();
        let last_uid = state.last_uid;

        // 获取新邮件
        let new_emails = if uid_next > last_uid + 1 {
            imap_service.fetch_new_emails(&folder, last_uid, limit).await?
        } else {
            Vec::new()
        };

        if !new_emails.is_empty() {
            // 追加到缓存
            storage.append_cached_emails(&account_id, &folder, &new_emails)?;

            // 更新同步状态
            let new_last_uid = new_emails.iter().map(|e| e.uid).max().unwrap_or(last_uid);
            let updated_state = FolderSyncState {
                account_id: account_id.clone(),
                folder: folder.clone(),
                last_uid: new_last_uid,
                uid_validity,
                last_sync_time: now,
            };
            storage.save_folder_sync_state(&updated_state)?;
        }

        // 从缓存返回
        if let Some(cached) = storage.get_cached_email_summaries(&account_id, &folder)? {
            cached.emails.into_iter().skip(offset).take(limit).collect()
        } else {
            new_emails
        }
    };

    Ok(emails)
}

#[tauri::command]
pub async fn fetch_email_detail(
    account_id: String,
    folder: String,
    uid: u32,
    force_refresh: Option<bool>,
    storage: StorageState<'_>,
) -> Result<Email, String> {
    let force = force_refresh.unwrap_or(false);

    // 1. 检查本地缓存（非强制刷新时）
    if !force {
        if let Some(email) = storage.get_cached_email_detail(&account_id, &folder, uid)? {
            return Ok(email);
        }
    }

    let (account, password) = get_account_with_password(&storage, &account_id)?;

    let imap_service = ImapService::new(account, password);

    // 2. 从服务器获取
    let email = imap_service.fetch_email_detail(&folder, uid).await?;

    // 3. 缓存邮件详情
    storage.cache_email_detail(&account_id, &folder, uid, &email)?;

    Ok(email)
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

    // 删除后清除缓存
    let result = imap_service.delete_email(&folder, uid).await;
    if result.is_ok() {
        // 清除相关缓存
        let _ = storage.clear_all_cache(&account_id, &folder);
    }
    result
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

    // 移动后清除两个文件夹的缓存
    let result = imap_service.move_email(&folder, uid, &dest_folder).await;
    if result.is_ok() {
        let _ = storage.clear_all_cache(&account_id, &folder);
        let _ = storage.clear_all_cache(&account_id, &dest_folder);
    }
    result
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
