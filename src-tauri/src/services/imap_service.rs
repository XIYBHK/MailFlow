use crate::models::{Email, EmailSummary, EmailAccount};
use native_tls::TlsConnector;
use std::net::TcpStream;

pub struct ImapService {
    account: EmailAccount,
}

impl ImapService {
    pub fn new(account: EmailAccount) -> Self {
        Self { account }
    }

    pub async fn connect(&self) -> Result<imap::Session<native_tls::TlsStream<TcpStream>>, String> {
        let tls = TlsConnector::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(|e| format!("TLS创建失败: {}", e))?;

        let client = imap::connect(
            (self.account.imap_server.as_str(), self.account.imap_port),
            &self.account.imap_server,
            &tls,
        )
        .map_err(|e| format!("IMAP连接失败: {}", e))?;

        // 对于163邮箱，使用更兼容的登录方式
        // 注意：password字段应该存储授权码，不是登录密码
        let mut client = client
            .login(&self.account.email, &self.account.password)
            .map_err(|(e, _)| {
                // 提供更友好的错误提示
                if e.to_string().contains("Unsafe Login") || e.to_string().contains("kefu@188.com") {
                    format!("163邮箱登录失败：请使用授权码而不是登录密码。获取方式：邮箱设置 -> POP3/SMTP/IMAP -> 开启服务并获取授权码")
                } else {
                    format!("IMAP登录失败: {}", e)
                }
            })?;

        // 发送ID命令（163邮箱要求）
        let id_args = format!("ID (\"name\" \"EmailClient\" \"version\" \"1.0.0\")");
        let _ = client.run_command_and_read_response(&id_args);

        Ok(client)
    }

    pub async fn list_folders(&self) -> Result<Vec<String>, String> {
        let mut client = self.connect().await?;

        let folders = client
            .list(None, None)
            .map_err(|e| format!("列出文件夹失败: {}", e))?;

        let mut result = Vec::new();
        for folder in folders.iter() {
            let name = folder.name();
            let name = name.replace("\"", "");
            if !name.is_empty() && !name.starts_with('.') {
                result.push(name);
            }
        }

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(result)
    }

    pub async fn fetch_emails(
        &self,
        folder: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<EmailSummary>, String> {
        let mut client = self.connect().await?;

        // 尝试选择文件夹，支持带引号和不带引号的格式
        let select_result = client
            .select(folder)
            .or_else(|_| client.select(format!("\"{}\"", folder)))
            .or_else(|_| client.select(format!("INBOX")));

        if let Err(e) = select_result {
            return Err(format!("选择文件夹 '{}' 失败: {}", folder, e));
        }

        // 搜索所有邮件
        let ids = client
            .search("ALL")
            .map_err(|e| format!("搜索邮件失败: {}", e))?;

        let mut ids_vec: Vec<u32> = ids.into_iter().collect();
        ids_vec.sort();
        ids_vec.reverse();

        let ids: Vec<u32> = ids_vec.into_iter().skip(offset).take(limit).collect();

        let mut emails = Vec::new();

        for uid in ids {
            let responses = client
                .fetch(uid.to_string(), "(RFC822.SIZE UID FLAGS ENVELOPE)")
                .map_err(|e| format!("获取邮件失败: {}", e))?;

            for response in responses.iter() {
                if let Some(email) = self.parse_email_summary(response, uid) {
                    emails.push(email);
                }
            }
        }

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(emails)
    }

    pub async fn fetch_email_detail(&self, folder: &str, uid: u32) -> Result<Email, String> {
        let mut client = self.connect().await?;

        client
            .select(format!("\"{}\"", folder))
            .map_err(|e| format!("选择文件夹失败: {}", e))?;

        let responses = client
            .fetch(uid.to_string(), "(RFC822)")
            .map_err(|e| format!("获取邮件详情失败: {}", e))?;

        if let Some(response) = responses.iter().next() {
            if let Some(body) = response.body() {
                client.logout().map_err(|e| format!("登出失败: {}", e))?;
                return Ok(self.parse_email_full(body, uid, folder));
            }
        }

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Err("未找到邮件".to_string())
    }

    fn parse_email_summary(&self, response: &imap::types::Fetch, uid: u32) -> Option<EmailSummary> {
        let flags = response.flags();

        let envelope = response.envelope()?;

        let subject = envelope.subject
            .and_then(|s| std::str::from_utf8(s).ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "(无主题)".to_string());

        let from = envelope.from
            .as_ref()
            .and_then(|addrs| addrs.first())
            .and_then(|addr| {
                addr.name.as_ref()
                    .or_else(|| addr.mailbox.as_ref())
            })
            .and_then(|s| std::str::from_utf8(s).ok())
            .map(|s| s.to_string())
            .unwrap_or_else(|| "未知发件人".to_string());

        let date = envelope.date
            .and_then(|d| std::str::from_utf8(d).ok())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc2822(s).ok()
                    .map(|dt| dt.with_timezone(&chrono::Utc))
            })
            .unwrap_or_else(|| chrono::Utc::now());

        let is_read = flags.contains(&imap::types::Flag::Seen);
        let is_starred = flags.contains(&imap::types::Flag::Flagged);
        let has_attachment = false;

        Some(EmailSummary {
            id: format!("{}_{}", self.account.id, uid),
            uid,
            subject,
            from,
            date: date.to_rfc3339(),
            is_read,
            is_starred,
            has_attachment,
            category: None,
            preview: String::new(),
            body: String::new(),
        })
    }

    fn parse_email_full(&self, body: &[u8], uid: u32, folder: &str) -> Email {
        // 简单的邮件解析
        let body_str = String::from_utf8_lossy(body).to_string();

        // 提取基本信息
        let subject = self.extract_header(&body_str, "Subject")
            .unwrap_or_else(|| "(无主题)".to_string());

        let from = self.extract_header(&body_str, "From")
            .unwrap_or_else(|| "未知发件人".to_string());

        let to = self.extract_header(&body_str, "To")
            .map(|t| vec![t])
            .unwrap_or_default();

        let date = self.extract_header(&body_str, "Date")
            .and_then(|d| {
                chrono::DateTime::parse_from_rfc2822(&d).ok()
                    .map(|dt| dt.with_timezone(&chrono::Utc))
            })
            .unwrap_or_else(|| chrono::Utc::now());

        let email_body = self.extract_body(&body_str);

        Email {
            id: format!("{}_{}", self.account.id, uid),
            uid,
            subject,
            from,
            to,
            date,
            body: email_body.clone(),
            html_body: None,
            folder: folder.to_string(),
            flags: Vec::new(),
            is_read: false,
            is_starred: false,
            category: None,
            has_attachment: false,
            size: body.len() as u64,
        }
    }

    fn extract_header(&self, email: &str, header: &str) -> Option<String> {
        email.lines()
            .find(|line| line.starts_with(&format!("{}:", header)))
            .and_then(|line| {
                line.split(':')
                    .skip(1)
                    .next()
                    .map(|s| s.trim().to_string())
            })
    }

    fn extract_body(&self, email: &str) -> String {
        // 查找空行后的内容作为邮件正文
        email.split("\n\n")
            .skip(1)
            .next()
            .unwrap_or("")
            .to_string()
    }

    pub async fn mark_as_read(&self, folder: &str, uid: u32) -> Result<(), String> {
        let mut client = self.connect().await?;

        client
            .select(format!("\"{}\"", folder))
            .map_err(|e| format!("选择文件夹失败: {}", e))?;

        client
            .store(uid.to_string(), "+FLAGS (\\Seen)")
            .map_err(|e| format!("标记已读失败: {}", e))?;

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(())
    }

    pub async fn delete_email(&self, folder: &str, uid: u32) -> Result<(), String> {
        let mut client = self.connect().await?;

        client
            .select(format!("\"{}\"", folder))
            .map_err(|e| format!("选择文件夹失败: {}", e))?;

        client
            .store(uid.to_string(), "+FLAGS (\\Deleted)")
            .map_err(|e| format!("删除邮件失败: {}", e))?;

        client.expunge().map_err(|e| format!("清理失败: {}", e))?;

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(())
    }

    pub async fn move_email(&self, folder: &str, uid: u32, dest_folder: &str) -> Result<(), String> {
        let mut client = self.connect().await?;

        client
            .select(format!("\"{}\"", folder))
            .map_err(|e| format!("选择文件夹失败: {}", e))?;

        client
            .copy(uid.to_string(), format!("\"{}\"", dest_folder))
            .map_err(|e| format!("复制邮件失败: {}", e))?;

        client
            .store(uid.to_string(), "+FLAGS (\\Deleted)")
            .map_err(|e| format!("标记删除失败: {}", e))?;

        client.expunge().map_err(|e| format!("清理失败: {}", e))?;

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(())
    }
}
