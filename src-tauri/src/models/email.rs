use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Email {
    pub id: String,
    pub uid: u32,
    pub subject: String,
    pub from: String,
    pub to: Vec<String>,
    pub date: DateTime<Utc>,
    pub body: String,
    pub html_body: Option<String>,
    pub folder: String,
    pub flags: Vec<String>,
    pub is_read: bool,
    pub is_starred: bool,
    pub category: Option<String>,
    pub has_attachment: bool,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailSummary {
    pub id: String,
    pub uid: u32,
    pub subject: String,
    pub from: String,
    pub date: String,
    pub is_read: bool,
    pub is_starred: bool,
    pub has_attachment: bool,
    pub category: Option<String>,
    pub preview: String,
    pub body: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Attachment {
    pub id: String,
    pub filename: String,
    pub size: u64,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum EmailCategory {
    Spam,
    Ads,
    Subscription,
    Work,
    Personal,
    Other,
}

impl EmailCategory {
    pub fn as_str(&self) -> &'static str {
        match self {
            EmailCategory::Spam => "spam",
            EmailCategory::Ads => "ads",
            EmailCategory::Subscription => "subscription",
            EmailCategory::Work => "work",
            EmailCategory::Personal => "personal",
            EmailCategory::Other => "other",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "spam" => EmailCategory::Spam,
            "ads" => EmailCategory::Ads,
            "subscription" => EmailCategory::Subscription,
            "work" => EmailCategory::Work,
            "personal" => EmailCategory::Personal,
            _ => EmailCategory::Other,
        }
    }
}

/// 文件夹同步状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderSyncState {
    pub account_id: String,
    pub folder: String,
    pub last_uid: u32,
    pub uid_validity: u32,
    pub last_sync_time: i64,
}

/// 缓存的邮件摘要列表
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CachedEmailList {
    pub account_id: String,
    pub folder: String,
    pub emails: Vec<EmailSummary>,
    pub last_updated: i64,
}
