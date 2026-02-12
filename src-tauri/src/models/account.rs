use serde::{Deserialize, Serialize};

/// 邮箱账户（存储在数据库中，不包含密码）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAccount {
    pub id: String,
    pub email: String,
    pub imap_server: String,
    pub imap_port: u16,
    pub smtp_server: String,
    pub smtp_port: u16,
    pub name: String,
    pub is_default: bool,
}

/// 用于创建账户时的临时结构（包含密码）
pub struct EmailAccountWithPassword {
    pub account: EmailAccount,
    pub password: String,
}

impl EmailAccountWithPassword {
    pub fn new_163(email: String, password: String, name: String) -> Self {
        let account = EmailAccount {
            id: uuid::Uuid::new_v4().to_string(),
            email,
            imap_server: "imap.163.com".to_string(),
            imap_port: 993,
            smtp_server: "smtp.163.com".to_string(),
            smtp_port: 465,
            name,
            is_default: false,
        };
        Self { account, password }
    }

    pub fn new_qq(email: String, password: String, name: String) -> Self {
        let account = EmailAccount {
            id: uuid::Uuid::new_v4().to_string(),
            email,
            imap_server: "imap.qq.com".to_string(),
            imap_port: 993,
            smtp_server: "smtp.qq.com".to_string(),
            smtp_port: 465,
            name,
            is_default: false,
        };
        Self { account, password }
    }

    pub fn new_gmail(email: String, password: String, name: String) -> Self {
        let account = EmailAccount {
            id: uuid::Uuid::new_v4().to_string(),
            email,
            imap_server: "imap.gmail.com".to_string(),
            imap_port: 993,
            smtp_server: "smtp.gmail.com".to_string(),
            smtp_port: 587,
            name,
            is_default: false,
        };
        Self { account, password }
    }
}

impl EmailAccount {
    /// 获取存储密码的 keyring 条目名称
    pub fn get_password_key(&self) -> String {
        format!("mailflow:email:password:{}", self.id)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmtpConfig {
    pub server: String,
    pub port: u16,
    pub use_tls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImapConfig {
    pub server: String,
    pub port: u16,
    pub use_ssl: bool,
}
