use crate::models::{Email, EmailSummary, EmailAccount};
use native_tls::TlsConnector;
use std::net::TcpStream;
use std::process::{Command, Stdio};
use std::io::Write;

pub struct ImapService {
    account: EmailAccount,
}

// 检查是否是163邮箱
fn is_163_email(account: &EmailAccount) -> bool {
    account.imap_server.contains("163.com") || account.email.contains("@163.com")
}

impl ImapService {
    pub fn new(account: EmailAccount) -> Self {
        Self { account }
    }

    pub async fn connect(&self) -> Result<imap::Session<native_tls::TlsStream<TcpStream>>, String> {
        // 先建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器
        let tls = TlsConnector::builder()
            .danger_accept_invalid_certs(true)
            .danger_accept_invalid_hostnames(true)
            .build()
            .map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 创建IMAP客户端
        let client = imap::Client::new(tls_stream);

        // 登录
        let client = client
            .login(&self.account.email, &self.account.password)
            .map_err(|(e, _)| {
                if e.to_string().contains("Unsafe Login") || e.to_string().contains("kefu@188.com") {
                    format!("163邮箱登录失败：请确保已在邮箱设置中开启IMAP服务并使用正确的授权码。错误: {}", e)
                } else {
                    format!("IMAP登录失败: {}", e)
                }
            })?;

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
        // 163邮箱使用直接IMAP连接
        if is_163_email(&self.account) {
            return self.fetch_emails_direct(folder, limit, offset).await;
        }

        let mut client = self.connect().await?;

        // 尝试选择文件夹，支持带引号和不带引号的格式
        let select_result = client
            .select(folder)
            .or_else(|_| client.select(format!("\"{}\"", folder)))
            .or_else(|_| client.select("INBOX"));

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

    // 使用openssl直接获取邮件（适用于163邮箱）
    async fn fetch_emails_direct(
        &self,
        folder: &str,
        limit: usize,
        offset: usize,
    ) -> Result<Vec<EmailSummary>, String> {
        use std::io::BufRead;

        println!("[163IMAP] 使用openssl获取163邮箱邮件...");

        // 构建IMAP命令序列 - 163邮箱需要ID命令
        let imap_commands = format!(
            "A001 LOGIN {} {}\nA002 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\nA003 SELECT {}\nA004 SEARCH ALL\nA005 LOGOUT\n",
            self.account.email,
            self.account.password,
            folder
        );

        println!("[163IMAP] 执行openssl命令...");
        println!("[163IMAP] 发送命令: {:?}", imap_commands);

        // 使用openssl执行IMAP命令
        let mut child = Command::new("openssl")
            .args(&[
                "s_client",
                "-connect",
                &format!("{}:{}", self.account.imap_server, self.account.imap_port),
                "-crlf",
                "-quiet"
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("启动openssl失败: {}", e))?;

        // 发送命令
        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(imap_commands.as_bytes()).map_err(|e| format!("发送命令失败: {}", e))?;
            stdin.flush().map_err(|e| format!("刷新stdin失败: {}", e))?;
            drop(stdin); // 显式关闭stdin
        }

        // 读取并解析输出
        let mut total_count = 0;
        if let Some(stdout) = child.stdout.take() {
            let reader = std::io::BufReader::new(stdout);

            for line in reader.lines() {
                let line = line.map_err(|e| format!("读取输出失败: {}", e))?;
                let trimmed = line.trim();

                println!("[163IMAP] 响应: {}", trimmed);

                // 解析EXISTS获取邮件总数
                if trimmed.contains("EXISTS") {
                    let parts: Vec<&str> = trimmed.split_whitespace().collect();
                    for part in parts {
                        if let Ok(count) = part.parse::<usize>() {
                            total_count = count;
                            println!("[163IMAP] 文件夹中有 {} 封邮件", count);
                            break;
                        }
                    }
                }

                // 如果看到LOGOUT完成，就结束
                if trimmed.contains("A005 OK") {
                    break;
                }
            }
        }

        child.wait().map_err(|e| format!("等待openssl完成失败: {}", e))?;

        // 现在获取最新的几封邮件
        if total_count == 0 {
            println!("[163IMAP] 没有找到邮件");
            return Ok(Vec::new());
        }

        // 计算要获取的邮件范围（最新的几封）
        let start = if total_count > limit { total_count - limit + 1 } else { 1 };
        let end = total_count;

        println!("[163IMAP] 获取邮件范围: {} 到 {}", start, end);

        // 获取邮件详情
        println!("[163IMAP] 开始第二步：获取邮件详情...");
        let fetch_commands = format!(
            "A001 LOGIN {} {}\nA002 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\nA003 SELECT {}\nA004 FETCH {}:{} (RFC822.SIZE UID FLAGS ENVELOPE)\nA005 LOGOUT\n",
            self.account.email,
            self.account.password,
            folder,
            start, end
        );

        let mut child = Command::new("openssl")
            .args(&[
                "s_client",
                "-connect",
                &format!("{}:{}", self.account.imap_server, self.account.imap_port),
                "-crlf",
                "-quiet"
            ])
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("启动openssl失败(第二步): {}", e))?;

        if let Some(mut stdin) = child.stdin.take() {
            stdin.write_all(fetch_commands.as_bytes()).map_err(|e| format!("发送命令失败(第二步): {}", e))?;
            stdin.flush().map_err(|e| format!("刷新stdin失败(第二步): {}", e))?;
            drop(stdin);
        }

        let mut emails = Vec::new();
        if let Some(stdout) = child.stdout.take() {
            let reader = std::io::BufReader::new(stdout);
            let mut current_uid = 0u32;
            let mut in_fetch = false;

            for line in reader.lines() {
                let line = line.map_err(|e| format!("读取输出失败(第二步): {}", e))?;
                let trimmed = line.trim();

                // 打印所有第二步响应
                println!("[163IMAP] 第二步响应: {}", trimmed);

                // 检测FETCH响应开始 - 格式是 "* 3551 FETCH"
                if trimmed.contains("FETCH") && !trimmed.starts_with("A00") && !trimmed.contains("OK") {
                    in_fetch = true;
                    println!("[163IMAP] 检测到FETCH响应");

                    // 尝试提取UID并立即添加邮件
                    if trimmed.contains("UID ") {
                        let parts: Vec<&str> = trimmed.split("UID ").collect();
                        if parts.len() > 1 {
                            let uid_part = parts[1];
                            // UID是第一个空格之前的部分
                            if let Some(space_pos) = uid_part.find(' ') {
                                let uid_str = uid_part[..space_pos].trim();
                                println!("[163IMAP] UID字符串: {}", uid_str);
                                if let Ok(uid) = uid_str.parse::<u32>() {
                                    current_uid = uid;
                                    println!("[163IMAP] 提取到UID: {}", uid);
                                    // 立即添加邮件
                                    emails.push(EmailSummary {
                                        id: format!("{}_{}", self.account.id, uid),
                                        uid,
                                        subject: "163邮箱邮件".to_string(),
                                        from: self.account.email.clone(),
                                        date: chrono::Utc::now().to_rfc3339(),
                                        is_read: false,
                                        is_starred: false,
                                        has_attachment: false,
                                        category: None,
                                        preview: format!("UID: {}", uid),
                                        body: String::new(),
                                    });
                                    println!("[163IMAP] 成功添加邮件: {}", uid);
                                    current_uid = 0;
                                }
                            }
                        }
                    }
                }

                // 如果看到LOGOUT完成，就结束
                if trimmed.contains("A005 OK") {
                    break;
                }
            }
        }

        child.wait().map_err(|e| format!("等待openssl完成失败(第二步): {}", e))?;
        println!("[163IMAP] 成功获取 {} 封邮件", emails.len());
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
        let body_str = String::from_utf8_lossy(body).to_string();

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
