use crate::models::{AppConfig, EmailAccount, FilterRule, FolderSyncState, CachedEmailList, EmailSummary, Email};
use keyring::Entry;
use sled::{Db, Tree};
use serde_json;
use std::path::PathBuf;
use std::sync::Arc;

pub struct StorageService {
    db: Arc<Db>,
    accounts_tree: Arc<Tree>,
    config_tree: Arc<Tree>,
    emails_cache_tree: Arc<Tree>,
    sync_state_tree: Arc<Tree>,
    email_summaries_tree: Arc<Tree>,
    email_details_tree: Arc<Tree>,
}

impl StorageService {
    pub fn new() -> Result<Self, String> {
        // 获取应用数据目录
        let data_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("email-client");

        std::fs::create_dir_all(&data_dir)
            .map_err(|e| format!("创建数据目录失败: {}", e))?;

        let db_path = data_dir.join("email-client.db");

        let db = sled::open(&db_path)
            .map_err(|e| format!("打开数据库失败: {}", e))?;

        let accounts_tree = db.open_tree("accounts")
            .map_err(|e| format!("打开accounts表失败: {}", e))?;

        let config_tree = db.open_tree("config")
            .map_err(|e| format!("打开config表失败: {}", e))?;

        let emails_cache_tree = db.open_tree("emails_cache")
            .map_err(|e| format!("打开emails_cache表失败: {}", e))?;

        let sync_state_tree = db.open_tree("sync_state")
            .map_err(|e| format!("打开sync_state表失败: {}", e))?;

        let email_summaries_tree = db.open_tree("email_summaries")
            .map_err(|e| format!("打开email_summaries表失败: {}", e))?;

        let email_details_tree = db.open_tree("email_details")
            .map_err(|e| format!("打开email_details表失败: {}", e))?;

        Ok(Self {
            db: Arc::new(db),
            accounts_tree: Arc::new(accounts_tree),
            config_tree: Arc::new(config_tree),
            emails_cache_tree: Arc::new(emails_cache_tree),
            sync_state_tree: Arc::new(sync_state_tree),
            email_summaries_tree: Arc::new(email_summaries_tree),
            email_details_tree: Arc::new(email_details_tree),
        })
    }

    // === 账户管理 ===
    pub fn save_account(&self, account: &EmailAccount) -> Result<(), String> {
        let key = account.id.as_bytes();
        let value = serde_json::to_vec(account)
            .map_err(|e| format!("序列化账户失败: {}", e))?;

        self.accounts_tree
            .insert(key, value)
            .map_err(|e| format!("保存账户失败: {}", e))?;

        Ok(())
    }

    pub fn get_account(&self, id: &str) -> Result<Option<EmailAccount>, String> {
        let key = id.as_bytes();

        let value = self.accounts_tree.get(key)
            .map_err(|e| format!("获取账户失败: {}", e))?;

        match value {
            Some(v) => {
                let account = serde_json::from_slice(&v)
                    .map_err(|e| format!("反序列化账户失败: {}", e))?;
                Ok(Some(account))
            }
            None => Ok(None),
        }
    }

    pub fn list_accounts(&self) -> Result<Vec<EmailAccount>, String> {
        let mut accounts = Vec::new();

        for item in self.accounts_tree.iter() {
            let (_, value) = item.map_err(|e| format!("读取账户失败: {}", e))?;
            let account = serde_json::from_slice(&value)
                .map_err(|e| format!("反序列化账户失败: {}", e))?;
            accounts.push(account);
        }

        Ok(accounts)
    }

    pub fn delete_account(&self, id: &str) -> Result<(), String> {
        // 先获取账户信息以删除密码
        if let Ok(Some(account)) = self.get_account(id) {
            let _ = self.delete_password(&account);
        }

        let key = id.as_bytes();
        self.accounts_tree
            .remove(key)
            .map_err(|e| format!("删除账户失败: {}", e))?;

        Ok(())
    }

    // === 密码管理（使用系统密钥链） ===
    /// 保存密码到系统密钥链
    pub fn save_password(&self, account: &EmailAccount, password: &str) -> Result<(), String> {
        let entry = Entry::new(&account.get_password_key(), &account.email)
            .map_err(|e| format!("创建密钥链条目失败: {}", e))?;

        entry.set_password(password)
            .map_err(|e| format!("保存密码失败: {}", e))?;

        Ok(())
    }

    /// 从系统密钥链获取密码
    pub fn get_password(&self, account: &EmailAccount) -> Result<Option<String>, String> {
        let entry = Entry::new(&account.get_password_key(), &account.email)
            .map_err(|e| format!("创建密钥链条目失败: {}", e))?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(format!("获取密码失败: {}", e)),
        }
    }

    /// 删除系统密钥链中的密码
    pub fn delete_password(&self, account: &EmailAccount) -> Result<(), String> {
        let entry = Entry::new(&account.get_password_key(), &account.email)
            .map_err(|e| format!("创建密钥链条目失败: {}", e))?;

        entry.delete_credential()
            .map_err(|e| format!("删除密码失败: {}", e))?;

        Ok(())
    }

    // === 配置管理 ===
    pub fn save_config(&self, config: &AppConfig) -> Result<(), String> {
        let key = b"app_config";
        let value = serde_json::to_vec(config)
            .map_err(|e| format!("序列化配置失败: {}", e))?;

        self.config_tree
            .insert(key, value)
            .map_err(|e| format!("保存配置失败: {}", e))?;

        Ok(())
    }

    pub fn get_config(&self) -> Result<AppConfig, String> {
        let key = b"app_config";

        let value = self.config_tree.get(key)
            .map_err(|e| format!("获取配置失败: {}", e))?;

        match value {
            Some(v) => {
                let config = serde_json::from_slice(&v)
                    .map_err(|e| format!("反序列化配置失败: {}", e))?;
                Ok(config)
            }
            None => Ok(AppConfig::default()),
        }
    }

    pub fn update_ai_api_key(&self, api_key: &str) -> Result<(), String> {
        let mut config = self.get_config()?;
        config.ai_config.zhipu_api_key = if api_key.is_empty() {
            None
        } else {
            Some(api_key.to_string())
        };
        self.save_config(&config)
    }

    // === 邮件缓存 ===
    pub fn cache_email(&self, folder: &str, uid: u32, data: &[u8]) -> Result<(), String> {
        let key = format!("{}:{}", folder, uid);
        self.emails_cache_tree
            .insert(key.as_bytes(), data)
            .map_err(|e| format!("缓存邮件失败: {}", e))?;
        Ok(())
    }

    pub fn get_cached_email(&self, folder: &str, uid: u32) -> Result<Option<Vec<u8>>, String> {
        let key = format!("{}:{}", folder, uid);
        let value = self.emails_cache_tree.get(key.as_bytes())
            .map_err(|e| format!("获取缓存邮件失败: {}", e))?;

        Ok(value.map(|v| v.to_vec()))
    }

    pub fn clear_folder_cache(&self, folder: &str) -> Result<(), String> {
        let prefix = format!("{}:", folder);
        let prefix_bytes = prefix.as_bytes();

        let keys_to_remove: Vec<Vec<u8>> = self.emails_cache_tree
            .scan_prefix(prefix_bytes)
            .map(|item| item.map(|(k, _)| k.to_vec()))
            .collect::<Result<_, _>>()
            .map_err(|e| format!("扫描缓存失败: {}", e))?;

        for key in keys_to_remove {
            self.emails_cache_tree
                .remove(&key)
                .map_err(|e| format!("删除缓存失败: {}", e))?;
        }

        Ok(())
    }

    // === 过滤规则 ===
    pub fn save_filter_rule(&self, rule: &FilterRule) -> Result<(), String> {
        let key = format!("rule:{}", rule.id);
        let value = serde_json::to_vec(rule)
            .map_err(|e| format!("序列化规则失败: {}", e))?;

        self.config_tree
            .insert(key.as_bytes(), value)
            .map_err(|e| format!("保存规则失败: {}", e))?;

        Ok(())
    }

    pub fn get_filter_rules(&self) -> Result<Vec<FilterRule>, String> {
        let mut rules = Vec::new();

        for item in self.config_tree.scan_prefix(b"rule:") {
            let (_, value) = item.map_err(|e| format!("读取规则失败: {}", e))?;
            let rule = serde_json::from_slice(&value)
                .map_err(|e| format!("反序列化规则失败: {}", e))?;
            rules.push(rule);
        }

        Ok(rules)
    }

    pub fn delete_filter_rule(&self, id: &str) -> Result<(), String> {
        let key = format!("rule:{}", id);
        self.config_tree
            .remove(key.as_bytes())
            .map_err(|e| format!("删除规则失败: {}", e))?;

        Ok(())
    }

    // === 文件夹同步状态 ===

    /// 保存文件夹同步状态
    pub fn save_folder_sync_state(&self, state: &FolderSyncState) -> Result<(), String> {
        let key = format!("{}:{}", state.account_id, state.folder);
        let value = serde_json::to_vec(state)
            .map_err(|e| format!("序列化同步状态失败: {}", e))?;

        self.sync_state_tree
            .insert(key.as_bytes(), value)
            .map_err(|e| format!("保存同步状态失败: {}", e))?;

        Ok(())
    }

    /// 获取文件夹同步状态
    pub fn get_folder_sync_state(&self, account_id: &str, folder: &str) -> Result<Option<FolderSyncState>, String> {
        let key = format!("{}:{}", account_id, folder);
        let value = self.sync_state_tree.get(key.as_bytes())
            .map_err(|e| format!("获取同步状态失败: {}", e))?;

        match value {
            Some(v) => {
                let state = serde_json::from_slice(&v)
                    .map_err(|e| format!("反序列化同步状态失败: {}", e))?;
                Ok(Some(state))
            }
            None => Ok(None),
        }
    }

    // === 邮件摘要缓存 ===

    /// 缓存邮件摘要列表
    pub fn cache_email_summaries(&self, account_id: &str, folder: &str, emails: &[EmailSummary]) -> Result<(), String> {
        let key = format!("{}:{}", account_id, folder);
        let cached = CachedEmailList {
            account_id: account_id.to_string(),
            folder: folder.to_string(),
            emails: emails.to_vec(),
            last_updated: chrono::Utc::now().timestamp(),
        };
        let value = serde_json::to_vec(&cached)
            .map_err(|e| format!("序列化邮件列表失败: {}", e))?;

        self.email_summaries_tree
            .insert(key.as_bytes(), value)
            .map_err(|e| format!("缓存邮件列表失败: {}", e))?;

        Ok(())
    }

    /// 获取缓存的邮件摘要列表
    pub fn get_cached_email_summaries(&self, account_id: &str, folder: &str) -> Result<Option<CachedEmailList>, String> {
        let key = format!("{}:{}", account_id, folder);
        let value = self.email_summaries_tree.get(key.as_bytes())
            .map_err(|e| format!("获取缓存邮件列表失败: {}", e))?;

        match value {
            Some(v) => {
                let cached = serde_json::from_slice(&v)
                    .map_err(|e| format!("反序列化邮件列表失败: {}", e))?;
                Ok(Some(cached))
            }
            None => Ok(None),
        }
    }

    /// 追加新邮件到缓存
    pub fn append_cached_emails(&self, account_id: &str, folder: &str, new_emails: &[EmailSummary]) -> Result<(), String> {
        let mut cached = self.get_cached_email_summaries(account_id, folder)?
            .unwrap_or_else(|| CachedEmailList {
                account_id: account_id.to_string(),
                folder: folder.to_string(),
                emails: Vec::new(),
                last_updated: 0,
            });

        // 将新邮件插入到列表开头（最新的在前）
        for email in new_emails.iter().rev() {
            // 避免重复
            if !cached.emails.iter().any(|e| e.uid == email.uid) {
                cached.emails.insert(0, email.clone());
            }
        }

        cached.last_updated = chrono::Utc::now().timestamp();
        self.cache_email_summaries(account_id, folder, &cached.emails)
    }

    // === 邮件详情缓存 ===

    /// 缓存邮件详情
    pub fn cache_email_detail(&self, account_id: &str, folder: &str, uid: u32, email: &Email) -> Result<(), String> {
        let key = format!("{}:{}:{}", account_id, folder, uid);
        let value = serde_json::to_vec(email)
            .map_err(|e| format!("序列化邮件详情失败: {}", e))?;

        self.email_details_tree
            .insert(key.as_bytes(), value)
            .map_err(|e| format!("缓存邮件详情失败: {}", e))?;

        Ok(())
    }

    /// 获取缓存的邮件详情
    pub fn get_cached_email_detail(&self, account_id: &str, folder: &str, uid: u32) -> Result<Option<Email>, String> {
        let key = format!("{}:{}:{}", account_id, folder, uid);
        let value = self.email_details_tree.get(key.as_bytes())
            .map_err(|e| format!("获取缓存邮件详情失败: {}", e))?;

        match value {
            Some(v) => {
                let email = serde_json::from_slice(&v)
                    .map_err(|e| format!("反序列化邮件详情失败: {}", e))?;
                Ok(Some(email))
            }
            None => Ok(None),
        }
    }

    /// 清除文件夹的所有缓存
    pub fn clear_all_cache(&self, account_id: &str, folder: &str) -> Result<(), String> {
        // 清除邮件摘要缓存
        let key = format!("{}:{}", account_id, folder);
        self.email_summaries_tree
            .remove(key.as_bytes())
            .map_err(|e| format!("清除邮件摘要缓存失败: {}", e))?;

        // 清除同步状态
        self.sync_state_tree
            .remove(key.as_bytes())
            .map_err(|e| format!("清除同步状态失败: {}", e))?;

        // 清除邮件详情缓存（扫描前缀）
        let prefix = format!("{}:{}:", account_id, folder);
        let keys_to_remove: Vec<Vec<u8>> = self.email_details_tree
            .scan_prefix(prefix.as_bytes())
            .map(|item| item.map(|(k, _)| k.to_vec()))
            .collect::<Result<_, _>>()
            .map_err(|e| format!("扫描邮件详情缓存失败: {}", e))?;

        for key in keys_to_remove {
            self.email_details_tree
                .remove(&key)
                .map_err(|e| format!("删除邮件详情缓存失败: {}", e))?;
        }

        Ok(())
    }

    pub fn flush(&self) -> Result<(), String> {
        self.db
            .flush()
            .map_err(|e| format!("同步数据库失败: {}", e))?;
        Ok(())
    }
}

impl Clone for StorageService {
    fn clone(&self) -> Self {
        Self {
            db: Arc::clone(&self.db),
            accounts_tree: Arc::clone(&self.accounts_tree),
            config_tree: Arc::clone(&self.config_tree),
            emails_cache_tree: Arc::clone(&self.emails_cache_tree),
            sync_state_tree: Arc::clone(&self.sync_state_tree),
            email_summaries_tree: Arc::clone(&self.email_summaries_tree),
            email_details_tree: Arc::clone(&self.email_details_tree),
        }
    }
}
