use crate::models::{Email, EmailSummary, EmailAccount};
use native_tls::TlsConnector;
use std::net::TcpStream;
use std::io::{Read, Write};

pub struct ImapService {
    account: EmailAccount,
    password: String,
}

// 检查是否是163邮箱
fn is_163_email(account: &EmailAccount) -> bool {
    account.imap_server.contains("163.com") || account.email.contains("@163.com")
}

impl ImapService {
    pub fn new(account: EmailAccount, password: String) -> Self {
        Self { account, password }
    }

    pub async fn connect(&self) -> Result<imap::Session<native_tls::TlsStream<TcpStream>>, String> {
        // 先建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器（生产环境启用证书验证）
        let tls = if cfg!(debug_assertions) {
            // 开发环境：允许自签名证书
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
                .map_err(|e| format!("TLS创建失败: {}", e))?
        } else {
            // 生产环境：严格验证证书
            TlsConnector::builder()
                .build()
                .map_err(|e| format!("TLS创建失败: {}", e))?
        };

        // 升级到TLS
        let tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 创建IMAP客户端
        let client = imap::Client::new(tls_stream);

        // 登录
        let client = client
            .login(&self.account.email, &self.password)
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
        // 163邮箱使用特殊连接方式
        if is_163_email(&self.account) {
            return self.fetch_emails_163(folder, limit, offset).await;
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
            // 首先获取邮件摘要（ENVELOPE）
            let responses = client
                .fetch(uid.to_string(), "(RFC822.SIZE UID FLAGS ENVELOPE)")
                .map_err(|e| format!("获取邮件摘要失败: {}", e))?;

            if let Some(response) = responses.iter().next() {
                if let Some(mut summary) = self.parse_email_summary(response, uid) {
                    // 然后获取邮件正文预览（前2000字节）
                    match client.fetch(uid.to_string(), "(RFC822.PEEK[HEADER.FIELDS (Subject From Date)] BODY.PEEK[TEXT]<0.2000>)") {
                        Ok(body_responses) => {
                            if let Some(body_response) = body_responses.iter().next() {
                                // 尝试获取正文内容 - text() 返回 Option<&[u8]>
                                if let Some(body_text) = body_response.text() {
                                    let body_str = String::from_utf8_lossy(body_text);
                                    let body = self.extract_body(&body_str);
                                    summary.preview = body.chars().take(200).collect::<String>().replace('\n', " ");
                                    summary.body = body.chars().take(1000).collect();
                                }
                            }
                        }
                        Err(e) => {
                            // 获取正文失败不影响显示摘要
                            eprintln!("获取邮件正文预览失败 (UID: {}): {}", uid, e);
                        }
                    }
                    emails.push(summary);
                }
            }
        }

        client.logout().map_err(|e| format!("登出失败: {}", e))?;
        Ok(emails)
    }

    // 使用原生 TCP/TLS 连接获取163邮箱邮件（不依赖外部 openssl 程序）
    // 163邮箱需要ID命令才能登录，这里使用自定义 IMAP 实现
    #[allow(unused_variables)]
    async fn fetch_emails_163(
        &self,
        folder: &str,
        limit: usize,
        _offset: usize,
    ) -> Result<Vec<EmailSummary>, String> {
        use native_tls::TlsConnector;
        use std::io::{Read, Write};

        // 建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器（开发环境允许自签名证书）
        let tls = if cfg!(debug_assertions) {
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
        } else {
            TlsConnector::builder().build()
        }.map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let mut tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 读取欢迎信息
        let mut buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取欢迎信息失败: {}", e))?;

        // 发送ID命令（163邮箱必需）
        let id_cmd = b"A001 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\r\n";
        tls_stream.write_all(id_cmd).map_err(|e| format!("发送ID命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取ID响应失败: {}", e))?;

        // 发送LOGIN命令
        let login_cmd = format!("A002 LOGIN \"{}\" \"{}\"\r\n", self.account.email, self.password);
        tls_stream.write_all(login_cmd.as_bytes()).map_err(|e| format!("发送LOGIN命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer2 = [0u8; 1024];
        let n = tls_stream.read(&mut buffer2).map_err(|e| format!("读取LOGIN响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer2[..n]);
        if response.contains("NO") || response.contains("BAD") {
            return Err(format!("163邮箱登录失败: {}", response));
        }

        // 选择文件夹
        let select_cmd = format!("A003 SELECT \"{}\"\r\n", folder);
        tls_stream.write_all(select_cmd.as_bytes()).map_err(|e| format!("发送SELECT命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        // 读取响应并解析邮件数量
        let mut total_count = 0;
        let mut buffer3 = [0u8; 2048];
        let n = tls_stream.read(&mut buffer3).map_err(|e| format!("读取SELECT响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer3[..n]);
        for line in response.lines() {
            if line.contains("EXISTS") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                for part in parts {
                    if let Ok(count) = part.parse::<usize>() {
                        total_count = count;
                        break;
                    }
                }
            }
        }

        if total_count == 0 {
            // 发送LOGOUT
            let _ = tls_stream.write_all(b"A004 LOGOUT\r\n");
            return Ok(Vec::new());
        }

        // 计算要获取的邮件范围（最新的）
        let start = if total_count > limit { total_count - limit + 1 } else { 1 };
        let end = total_count;

        // 使用 UID SEARCH 获取所有邮件的 UID 列表
        let mut emails = Vec::new();
        let search_cmd = b"A004 UID SEARCH ALL\r\n";
        tls_stream.write_all(search_cmd).map_err(|e| format!("发送SEARCH命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        // 读取SEARCH响应
        let mut uid_list: Vec<u32> = Vec::new();
        let mut response_data = String::new();
        loop {
            let mut buffer4 = [0u8; 4096];
            match tls_stream.read(&mut buffer4) {
                Ok(n) if n > 0 => {
                    let chunk = String::from_utf8_lossy(&buffer4[..n]);
                    response_data.push_str(&chunk);
                    if chunk.contains("A004 OK") || chunk.contains("A004 BAD") || chunk.contains("A004 NO") {
                        break;
                    }
                }
                _ => break,
            }
        }

        // 解析SEARCH响应: * SEARCH 1 2 3 4 5
        for line in response_data.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("* SEARCH") {
                // 提取所有 UID 数字
                let uids: Vec<u32> = trimmed
                    .split_whitespace()
                    .skip(2) // 跳过 "*" 和 "SEARCH"
                    .filter_map(|s| s.parse().ok())
                    .collect();
                uid_list.extend(uids);
            }
        }

        // 按UID降序排列（最新的在前），并限制数量
        uid_list.sort_unstable_by(|a, b| b.cmp(a));
        uid_list.truncate(limit);

        // 获取每封邮件的完整内容
        for uid in uid_list {
            match self.fetch_email_163_rfc822(&mut tls_stream, folder, uid).await {
                Ok(email) => emails.push(email),
                Err(_e) => {
                    // 获取失败时跳过
                }
            }
        }

        // 发送LOGOUT
        let _ = tls_stream.write_all(b"A005 LOGOUT\r\n");
        let _ = tls_stream.flush();

        Ok(emails)
    }

    // 辅助方法：从163邮箱获取单封邮件的RFC822内容
    async fn fetch_email_163_rfc822<S: Read + Write>(
        &self,
        stream: &mut S,
        _folder: &str,
        uid: u32,
    ) -> Result<EmailSummary, String> {

        // 发送 UID FETCH RFC822 命令
        let fetch_cmd = format!("A005 UID FETCH {} (RFC822)\r\n", uid);
        stream.write_all(fetch_cmd.as_bytes()).map_err(|e| format!("发送FETCH命令失败: {}", e))?;
        stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        // 读取响应
        let mut response_content = String::new();
        let mut buffer = [0u8; 4096];

        loop {
            match stream.read(&mut buffer) {
                Ok(n) if n > 0 => {
                    let chunk = &buffer[..n];
                    let text = String::from_utf8_lossy(chunk);
                    response_content.push_str(&text);

                    // 检查是否完成
                    if text.contains("A005 OK") || text.contains("A005 BAD") || text.contains("A005 NO") {
                        break;
                    }
                }
                _ => break,
            }
        }

        // 从IMAP响应中提取实际的RFC822邮件内容
        let email_content = self.extract_rfc822_from_response(&response_content);

        // 解析邮件内容
        self.parse_email_from_rfc822(&email_content, uid)
            .ok_or_else(|| format!("无法解析邮件 UID: {}", uid))
    }

    /// 从IMAP FETCH响应中提取RFC822邮件内容
    fn extract_rfc822_from_response(&self, response: &str) -> String {
        let mut in_email = false;
        let mut email_lines: Vec<&str> = Vec::new();

        for line in response.lines() {
            let trimmed = line.trim();

            // 检测到FETCH响应开始行，例如: * 1 FETCH (RFC822 {1234}
            if trimmed.starts_with("*") && trimmed.contains("FETCH") && trimmed.contains("RFC822") {
                in_email = true;
                continue;
            }

            // 检测结束标记：单独的 ) 行
            if in_email && trimmed == ")" {
                break;
            }

            // 检测IMAP响应结束标记
            if trimmed.starts_with("A005") && (trimmed.contains("OK") || trimmed.contains("BAD") || trimmed.contains("NO")) {
                break;
            }

            // 收集邮件内容行
            if in_email {
                email_lines.push(line);
            }
        }

        email_lines.join("\n")
    }

    /// 从RFC822格式的邮件内容解析EmailSummary
    fn parse_email_from_rfc822(&self, content: &str, uid: u32) -> Option<EmailSummary> {
        let subject = self.extract_header(content, "Subject")
            .map(|s| self.decode_rfc2047(&s))
            .unwrap_or_else(|| "(无主题)".to_string());

        let from = self.extract_header(content, "From")
            .map(|s| {
                let decoded = self.decode_rfc2047(&s);
                self.extract_display_name(&decoded)
            })
            .unwrap_or_else(|| "未知发件人".to_string());

        let date_str = self.extract_header(content, "Date").unwrap_or_default();
        let date = chrono::DateTime::parse_from_rfc2822(&date_str)
            .ok()
            .map(|dt| dt.with_timezone(&chrono::Utc).to_rfc3339())
            .unwrap_or_else(|| chrono::Utc::now().to_rfc3339());

        // 提取正文内容用于预览
        let body = self.extract_body(content);
        let plain_text = self.html_to_text(&body);
        let preview = plain_text.chars().take(200).collect::<String>().replace('\n', " ");

        // 检查是否有附件
        let has_attachment = content.to_lowercase().contains("content-disposition: attachment");

        Some(EmailSummary {
            id: format!("{}_{}", self.account.id, uid),
            uid,
            subject,
            from,
            date,
            is_read: false, // 163邮箱需要单独处理已读状态
            is_starred: false,
            has_attachment,
            category: None,
            preview,
            body: body.chars().take(1000).collect(), // 限制body长度
        })
    }

    /// 解码 RFC 2047 编码的字符串（如 =?UTF-8?B?...?= 或 =?UTF-8?Q?...?=）
    fn decode_rfc2047(&self, text: &str) -> String {
        // 正则表达式风格的手动解析
        let mut result = String::new();
        let mut chars = text.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '=' && chars.peek() == Some(&'?') {
                // 尝试解析 RFC 2047 编码块
                chars.next(); // 跳过 '?'

                // 读取字符集
                let mut charset = String::new();
                while let Some(&c) = chars.peek() {
                    if c == '?' {
                        break;
                    }
                    charset.push(c);
                    chars.next();
                }

                if chars.peek() != Some(&'?') {
                    result.push('=');
                    result.push_str(&charset);
                    continue;
                }
                chars.next(); // 跳过 '?'

                // 读取编码方式 (B 或 Q)
                let encoding = chars.next();
                if chars.peek() != Some(&'?') {
                    result.push('=');
                    result.push('?');
                    result.push_str(&charset);
                    result.push('?');
                    if let Some(e) = encoding {
                        result.push(e);
                    }
                    continue;
                }
                chars.next(); // 跳过 '?'

                // 读取编码内容直到 ?=
                let mut encoded = String::new();
                while let Some(&c) = chars.peek() {
                    if c == '?' {
                        chars.next();
                        if chars.peek() == Some(&'=') {
                            chars.next();
                            break;
                        } else {
                            encoded.push('?');
                        }
                    } else {
                        encoded.push(c);
                        chars.next();
                    }
                }

                // 解码
                let decoded = match encoding {
                    Some('B') | Some('b') => {
                        // Base64 解码
                        base64::decode(encoded.replace(" ", ""))
                            .ok()
                            .and_then(|bytes| {
                                if charset.to_lowercase().contains("utf-8") {
                                    String::from_utf8(bytes).ok()
                                } else {
                                    // 对于其他编码，尝试 UTF-8
                                    String::from_utf8(bytes).ok()
                                }
                            })
                    }
                    Some('Q') | Some('q') => {
                        // Quoted-Printable 解码
                        Some(self.decode_rfc2047_q_encoding(&encoded))
                    }
                    _ => None,
                };

                if let Some(decoded_str) = decoded {
                    result.push_str(&decoded_str);
                } else {
                    // 解码失败，保留原始编码
                    result.push_str(&format!("=?{}?{}?{}?=" , charset,
                        encoding.map(|c| c.to_string()).unwrap_or_default(), encoded));
                }
            } else {
                result.push(ch);
            }
        }

        result
    }

    /// 解码 RFC 2047 Q 编码（类似 Quoted-Printable）
    fn decode_rfc2047_q_encoding(&self, encoded: &str) -> String {
        let mut result = String::new();
        let mut chars = encoded.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '=' {
                let hex: String = chars.by_ref().take(2).collect();
                if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                    result.push(byte as char);
                } else {
                    result.push('=');
                    result.push_str(&hex);
                }
            } else if ch == '_' {
                result.push(' ');
            } else {
                result.push(ch);
            }
        }

        result
    }

    /// 从 From 头中提取显示名称
    /// 输入: "Name" <email@example.com> 或 email@example.com
    /// 输出: Name 或 email (如果无显示名称则返回@前的部分)
    fn extract_display_name(&self, from: &str) -> String {
        let trimmed = from.trim();

        // 尝试提取 "Name" <email> 中的 Name
        if trimmed.starts_with('"') {
            // 格式: "Name" <email>
            if let Some(end_quote) = trimmed[1..].find('"') {
                return trimmed[1..=end_quote].to_string();
            }
        }

        // 尝试提取 Name <email> 中的 Name
        if let Some(lt_pos) = trimmed.find('<') {
            let name_part = trimmed[..lt_pos].trim();
            if !name_part.is_empty() {
                return name_part.to_string();
            }
            // 如果没有名称部分，提取邮箱@前的部分
            if let Some(gt_pos) = trimmed.find('>') {
                let email = &trimmed[lt_pos + 1..gt_pos];
                if let Some(at_pos) = email.find('@') {
                    return email[..at_pos].to_string();
                }
                return email.to_string();
            }
        }

        // 纯邮箱格式: email@example.com
        if let Some(at_pos) = trimmed.find('@') {
            return trimmed[..at_pos].to_string();
        }

        // 返回原值
        trimmed.to_string()
    }

    pub async fn fetch_email_detail(&self, folder: &str, uid: u32) -> Result<Email, String> {
        // 163邮箱使用特殊处理
        if is_163_email(&self.account) {
            return self.fetch_email_detail_163(folder, uid).await;
        }

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

    /// 为163邮箱获取邮件详情
    async fn fetch_email_detail_163(&self, folder: &str, uid: u32) -> Result<Email, String> {
        use native_tls::TlsConnector;
        use std::io::{Read, Write};

        // 建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器
        let tls = if cfg!(debug_assertions) {
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
        } else {
            TlsConnector::builder().build()
        }.map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let mut tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 读取欢迎信息
        let mut buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取欢迎信息失败: {}", e))?;

        // 发送ID命令（163邮箱必需）
        let id_cmd = b"A001 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\r\n";
        tls_stream.write_all(id_cmd).map_err(|e| format!("发送ID命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取ID响应失败: {}", e))?;

        // 发送LOGIN命令
        let login_cmd = format!("A002 LOGIN \"{}\" \"{}\"\r\n", self.account.email, self.password);
        tls_stream.write_all(login_cmd.as_bytes()).map_err(|e| format!("发送LOGIN命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer2 = [0u8; 1024];
        let n = tls_stream.read(&mut buffer2).map_err(|e| format!("读取LOGIN响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer2[..n]);
        if response.contains("NO") || response.contains("BAD") {
            return Err(format!("163邮箱登录失败: {}", response));
        }

        // 选择文件夹
        let select_cmd = format!("A003 SELECT \"{}\"\r\n", folder);
        tls_stream.write_all(select_cmd.as_bytes()).map_err(|e| format!("发送SELECT命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer3 = [0u8; 2048];
        tls_stream.read(&mut buffer3).map_err(|e| format!("读取SELECT响应失败: {}", e))?;

        // 发送 UID FETCH RFC822 命令
        let fetch_cmd = format!("A004 UID FETCH {} (RFC822)\r\n", uid);
        tls_stream.write_all(fetch_cmd.as_bytes()).map_err(|e| format!("发送FETCH命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        // 读取响应
        let mut response_content = String::new();
        loop {
            let mut buffer4 = [0u8; 4096];
            match tls_stream.read(&mut buffer4) {
                Ok(n) if n > 0 => {
                    let chunk = String::from_utf8_lossy(&buffer4[..n]);
                    response_content.push_str(&chunk);
                    if chunk.contains("A004 OK") || chunk.contains("A004 BAD") || chunk.contains("A004 NO") {
                        break;
                    }
                }
                _ => break,
            }
        }

        // 发送LOGOUT
        let _ = tls_stream.write_all(b"A005 LOGOUT\r\n");
        let _ = tls_stream.flush();

        // 提取邮件内容
        let email_content = self.extract_rfc822_from_response(&response_content);
        if email_content.is_empty() {
            return Err("未找到邮件内容".to_string());
        }

        Ok(self.parse_email_full_str(&email_content, uid, folder))
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
        self.parse_email_full_str(&body_str, uid, folder)
    }

    fn parse_email_full_str(&self, body_str: &str, uid: u32, folder: &str) -> Email {
        let subject = self.extract_header(body_str, "Subject")
            .map(|s| self.decode_rfc2047(&s))
            .unwrap_or_else(|| "(无主题)".to_string());

        let from = self.extract_header(body_str, "From")
            .map(|s| self.decode_rfc2047(&s))
            .unwrap_or_else(|| "未知发件人".to_string());

        let to = self.extract_header(body_str, "To")
            .map(|t| vec![self.decode_rfc2047(&t)])
            .unwrap_or_default();

        let date = self.extract_header(body_str, "Date")
            .and_then(|d| {
                chrono::DateTime::parse_from_rfc2822(&d).ok()
                    .map(|dt| dt.with_timezone(&chrono::Utc))
            })
            .unwrap_or_else(|| chrono::Utc::now());

        let email_body = self.extract_body(body_str);

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
            size: body_str.len() as u64,
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

    /// 提取邮件正文内容
    /// 改进版：支持 MIME 多部分邮件解析和字符集检测
    fn extract_body(&self, email: &str) -> String {
        // 查找头部和正文的分隔（第一个空行）
        let parts: Vec<&str> = email.splitn(2, "\n\n").collect();
        if parts.len() < 2 {
            return String::new();
        }

        let headers = parts[0];
        let body = parts[1];

        // 获取完整的 Content-Type（包含 charset）
        let content_type_full = self.extract_header(headers, "Content-Type")
            .unwrap_or_default();
        let content_type_lower = content_type_full.to_lowercase();

        if content_type_lower.contains("multipart/") {
            // 尝试提取 boundary
            if let Some(boundary) = content_type_lower.split("boundary=").nth(1) {
                let boundary = boundary.trim().trim_matches('"').trim_matches('\'');
                return self.extract_multipart_body(body, boundary);
            }
        }

        // 提取字符集
        let charset = self.extract_charset(&content_type_full);

        // 检查内容传输编码
        let transfer_encoding = self.extract_header(headers, "Content-Transfer-Encoding")
            .unwrap_or_default();

        let decoded_body = if transfer_encoding.to_lowercase().contains("base64") {
            self.decode_base64_with_charset(body, &charset)
        } else if transfer_encoding.to_lowercase().contains("quoted-printable") {
            self.decode_quoted_printable_with_charset(body, &charset)
        } else {
            // 对于普通文本，尝试使用检测到的字符集
            self.try_decode_with_charset(body.as_bytes(), &charset)
        };

        decoded_body.trim().to_string()
    }

    /// 从 MIME 多部分邮件中提取纯文本内容
    fn extract_multipart_body(&self, body: &str, boundary: &str) -> String {
        let delimiter = format!("--{}", boundary);
        let end_marker = format!("--{}--", boundary);

        let mut text_plain_content = String::new();
        let mut text_html_content = String::new();
        let mut current_headers = String::new();
        let mut current_content = String::new();
        let mut in_part = false;
        let mut in_part_content = false;
        let mut current_content_type = String::new();
        let mut current_transfer_encoding = String::new();

        for line in body.lines() {
            let trimmed = line.trim();

            // 检查是否是结束标记
            if trimmed == end_marker {
                // 保存最后一个部分
                if in_part {
                    let decoded = self.decode_part_content(&current_content, &current_transfer_encoding, &current_content_type);
                    if current_content_type.to_lowercase().contains("text/plain") {
                        text_plain_content = decoded;
                    } else if current_content_type.to_lowercase().contains("text/html") {
                        text_html_content = decoded;
                    }
                }
                break;
            }

            // 检查是否是部分分隔符
            if trimmed == delimiter {
                // 保存之前部分的内容
                if in_part {
                    let decoded = self.decode_part_content(&current_content, &current_transfer_encoding, &current_content_type);
                    if current_content_type.to_lowercase().contains("text/plain") {
                        text_plain_content = decoded;
                    } else if current_content_type.to_lowercase().contains("text/html") {
                        text_html_content = decoded;
                    }
                }
                // 开始新部分
                in_part = true;
                in_part_content = false;
                current_headers.clear();
                current_content.clear();
                current_content_type.clear();
                current_transfer_encoding.clear();
                continue;
            }

            if !in_part {
                continue;
            }

            // 收集头部
            if !in_part_content {
                if trimmed.is_empty() {
                    // 头部结束，解析头部信息
                    let headers_lower = current_headers.to_lowercase();
                    // 提取 Content-Type
                    if let Some(ct_start) = headers_lower.find("content-type:") {
                        let ct_line = &current_headers[ct_start..];
                        if let Some(ct_end) = ct_line.find('\n') {
                            current_content_type = ct_line[..ct_end].to_string();
                        } else {
                            current_content_type = ct_line.to_string();
                        }
                    }
                    // 提取 Content-Transfer-Encoding
                    if let Some(cte_start) = headers_lower.find("content-transfer-encoding:") {
                        let cte_line = &current_headers[cte_start..];
                        if let Some(cte_end) = cte_line.find('\n') {
                            current_transfer_encoding = cte_line[..cte_end].to_string();
                        } else {
                            current_transfer_encoding = cte_line.to_string();
                        }
                    }
                    in_part_content = true;
                } else {
                    current_headers.push_str(line);
                    current_headers.push('\n');
                }
            } else {
                // 收集正文内容
                current_content.push_str(line);
                current_content.push('\n');
            }
        }

        // 优先返回 text/plain，如果没有则返回转换后的 text/html
        if !text_plain_content.is_empty() {
            text_plain_content.trim().to_string()
        } else if !text_html_content.is_empty() {
            self.html_to_text(&text_html_content)
        } else {
            String::new()
        }
    }

    /// 解码邮件部分内容
    fn decode_part_content(&self, content: &str, transfer_encoding: &str, content_type: &str) -> String {
        let encoding_lower = transfer_encoding.to_lowercase();
        let charset = self.extract_charset(content_type);

        let decoded = if encoding_lower.contains("base64") {
            self.decode_base64_with_charset(content, &charset)
        } else if encoding_lower.contains("quoted-printable") {
            self.decode_quoted_printable_with_charset(content, &charset)
        } else {
            self.try_decode_with_charset(content.as_bytes(), &charset)
        };
        decoded.trim().to_string()
    }

    /// 从 Content-Type 中提取字符集
    fn extract_charset(&self, content_type: &str) -> String {
        let lower = content_type.to_lowercase();
        if let Some(charset_pos) = lower.find("charset=") {
            let charset_str = &content_type[charset_pos + 8..];
            let charset = charset_str
                .split(&[';', ' ', '"', '\''][..])
                .next()
                .unwrap_or("utf-8")
                .trim()
                .to_lowercase();
            return charset;
        }
        "utf-8".to_string()
    }

    /// 尝试使用指定字符集解码字节
    fn try_decode_with_charset(&self, bytes: &[u8], charset: &str) -> String {
        let charset_lower = charset.to_lowercase();

        // 首先尝试 UTF-8
        if charset_lower.contains("utf-8") || charset_lower.contains("utf8") {
            if let Ok(s) = String::from_utf8(bytes.to_vec()) {
                return s;
            }
        }

        // 尝试 GBK/GB2312
        if charset_lower.contains("gbk") || charset_lower.contains("gb2312") || charset_lower.contains("gb18030") {
            let (decoded, _encoding, _had_errors) = encoding_rs::GBK.decode(bytes);
            return decoded.to_string();
        }

        // 尝试 Big5
        if charset_lower.contains("big5") {
            let (decoded, _encoding, _had_errors) = encoding_rs::BIG5.decode(bytes);
            return decoded.to_string();
        }

        // 尝试 ISO-8859-1
        if charset_lower.contains("iso-8859-1") || charset_lower.contains("latin1") {
            let (decoded, _encoding, _had_errors) = encoding_rs::WINDOWS_1252.decode(bytes);
            return decoded.to_string();
        }

        // 默认：先尝试 UTF-8，失败则尝试 GBK
        if let Ok(s) = String::from_utf8(bytes.to_vec()) {
            return s;
        }

        // 尝试 GBK 作为后备
        let (decoded, _, _) = encoding_rs::GBK.decode(bytes);
        decoded.to_string()
    }

    /// 解码 Base64 编码的内容（支持字符集）
    fn decode_base64_with_charset(&self, content: &str, charset: &str) -> String {
        let cleaned: String = content.chars()
            .filter(|c| !c.is_whitespace())
            .collect();

        match base64::decode(&cleaned) {
            Ok(bytes) => self.try_decode_with_charset(&bytes, charset),
            Err(_) => content.to_string()
        }
    }

    /// 解码 Quoted-Printable 编码的内容（支持字符集）
    fn decode_quoted_printable_with_charset(&self, content: &str, charset: &str) -> String {
        let mut bytes: Vec<u8> = Vec::new();
        let mut chars = content.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '=' {
                if let Some(&next) = chars.peek() {
                    if next == '\n' || next == '\r' {
                        // 软换行，跳过
                        chars.next();
                        if chars.peek() == Some(&'\n') {
                            chars.next();
                        }
                        continue;
                    }

                    // 解码 hex
                    let hex: String = chars.by_ref().take(2).collect();
                    if let Ok(byte) = u8::from_str_radix(&hex, 16) {
                        bytes.push(byte);
                    } else {
                        bytes.push(b'=');
                        for c in hex.chars() {
                            bytes.push(c as u8);
                        }
                    }
                } else {
                    bytes.push(b'=');
                }
            } else {
                bytes.push(ch as u8);
            }
        }

        self.try_decode_with_charset(&bytes, charset)
    }

    /// 将 HTML 转换为纯文本（移除标签，保留内容）
    fn html_to_text(&self, html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;
        let mut in_script = false;
        let mut in_style = false;
        let mut tag_name = String::new();
        let mut chars = html.chars().peekable();

        while let Some(ch) = chars.next() {
            if ch == '<' {
                in_tag = true;
                tag_name.clear();
                continue;
            }

            if in_tag {
                if ch == '>' {
                    in_tag = false;
                    let tag_lower = tag_name.to_lowercase();

                    // 检测 script 和 style 标签
                    if tag_lower.starts_with("script") || tag_lower.starts_with("/script") {
                        in_script = !tag_lower.starts_with("/");
                    }
                    if tag_lower.starts_with("style") || tag_lower.starts_with("/style") {
                        in_style = !tag_lower.starts_with("/");
                    }

                    // 块级元素添加换行
                    if tag_lower.starts_with("/div") ||
                       tag_lower.starts_with("/p") ||
                       tag_lower.starts_with("/h") ||
                       tag_lower.starts_with("br") {
                        if !result.ends_with('\n') {
                            result.push(' ');
                        }
                    }
                } else if ch.is_ascii_alphabetic() || ch == '/' {
                    tag_name.push(ch);
                }
                continue;
            }

            // 跳过 script 和 style 内容
            if in_script || in_style {
                continue;
            }

            // 保留普通文本
            if !in_tag {
                result.push(ch);
            }
        }

        // 清理多余空白
        result.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    pub async fn mark_as_read(&self, folder: &str, uid: u32) -> Result<(), String> {
        // 163邮箱使用特殊处理
        if is_163_email(&self.account) {
            return self.mark_as_read_163(folder, uid).await;
        }

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

    /// 为163邮箱标记邮件已读
    async fn mark_as_read_163(&self, folder: &str, uid: u32) -> Result<(), String> {
        use native_tls::TlsConnector;
        use std::io::{Read, Write};

        // 建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器
        let tls = if cfg!(debug_assertions) {
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
        } else {
            TlsConnector::builder().build()
        }.map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let mut tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 读取欢迎信息
        let mut buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取欢迎信息失败: {}", e))?;

        // 发送ID命令（163邮箱必需）
        let id_cmd = b"A001 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\r\n";
        tls_stream.write_all(id_cmd).map_err(|e| format!("发送ID命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取ID响应失败: {}", e))?;

        // 发送LOGIN命令
        let login_cmd = format!("A002 LOGIN \"{}\" \"{}\"\r\n", self.account.email, self.password);
        tls_stream.write_all(login_cmd.as_bytes()).map_err(|e| format!("发送LOGIN命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer2 = [0u8; 1024];
        let n = tls_stream.read(&mut buffer2).map_err(|e| format!("读取LOGIN响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer2[..n]);
        if response.contains("NO") || response.contains("BAD") {
            return Err(format!("163邮箱登录失败: {}", response));
        }

        // 选择文件夹
        let select_cmd = format!("A003 SELECT \"{}\"\r\n", folder);
        tls_stream.write_all(select_cmd.as_bytes()).map_err(|e| format!("发送SELECT命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer3 = [0u8; 2048];
        tls_stream.read(&mut buffer3).map_err(|e| format!("读取SELECT响应失败: {}", e))?;

        // 标记已读
        let store_cmd = format!("A004 UID STORE {} +FLAGS (\\Seen)\r\n", uid);
        tls_stream.write_all(store_cmd.as_bytes()).map_err(|e| format!("发送STORE命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer4 = [0u8; 1024];
        tls_stream.read(&mut buffer4).map_err(|e| format!("读取STORE响应失败: {}", e))?;

        // 发送LOGOUT
        let _ = tls_stream.write_all(b"A005 LOGOUT\r\n");
        let _ = tls_stream.flush();

        Ok(())
    }

    pub async fn delete_email(&self, folder: &str, uid: u32) -> Result<(), String> {
        // 163邮箱使用特殊处理
        if is_163_email(&self.account) {
            return self.delete_email_163(folder, uid).await;
        }

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

    /// 为163邮箱删除邮件
    async fn delete_email_163(&self, folder: &str, uid: u32) -> Result<(), String> {
        use native_tls::TlsConnector;
        use std::io::{Read, Write};

        // 建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器
        let tls = if cfg!(debug_assertions) {
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
        } else {
            TlsConnector::builder().build()
        }.map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let mut tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 读取欢迎信息
        let mut buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取欢迎信息失败: {}", e))?;

        // 发送ID命令
        let id_cmd = b"A001 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\r\n";
        tls_stream.write_all(id_cmd).map_err(|e| format!("发送ID命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取ID响应失败: {}", e))?;

        // 发送LOGIN命令
        let login_cmd = format!("A002 LOGIN \"{}\" \"{}\"\r\n", self.account.email, self.password);
        tls_stream.write_all(login_cmd.as_bytes()).map_err(|e| format!("发送LOGIN命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer2 = [0u8; 1024];
        let n = tls_stream.read(&mut buffer2).map_err(|e| format!("读取LOGIN响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer2[..n]);
        if response.contains("NO") || response.contains("BAD") {
            return Err(format!("163邮箱登录失败: {}", response));
        }

        // 选择文件夹
        let select_cmd = format!("A003 SELECT \"{}\"\r\n", folder);
        tls_stream.write_all(select_cmd.as_bytes()).map_err(|e| format!("发送SELECT命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer3 = [0u8; 2048];
        tls_stream.read(&mut buffer3).map_err(|e| format!("读取SELECT响应失败: {}", e))?;

        // 标记删除
        let store_cmd = format!("A004 UID STORE {} +FLAGS (\\Deleted)\r\n", uid);
        tls_stream.write_all(store_cmd.as_bytes()).map_err(|e| format!("发送STORE命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer4 = [0u8; 1024];
        tls_stream.read(&mut buffer4).map_err(|e| format!("读取STORE响应失败: {}", e))?;

        // EXPUNGE
        let expunge_cmd = b"A005 EXPUNGE\r\n";
        tls_stream.write_all(expunge_cmd).map_err(|e| format!("发送EXPUNGE命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer5 = [0u8; 1024];
        tls_stream.read(&mut buffer5).map_err(|e| format!("读取EXPUNGE响应失败: {}", e))?;

        // 发送LOGOUT
        let _ = tls_stream.write_all(b"A006 LOGOUT\r\n");
        let _ = tls_stream.flush();

        Ok(())
    }

    pub async fn move_email(&self, folder: &str, uid: u32, dest_folder: &str) -> Result<(), String> {
        // 163邮箱使用特殊处理
        if is_163_email(&self.account) {
            return self.move_email_163(folder, uid, dest_folder).await;
        }

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

    /// 为163邮箱移动邮件
    async fn move_email_163(&self, folder: &str, uid: u32, dest_folder: &str) -> Result<(), String> {
        use native_tls::TlsConnector;
        use std::io::{Read, Write};

        // 建立TCP连接
        let stream = TcpStream::connect((self.account.imap_server.as_str(), self.account.imap_port))
            .map_err(|e| format!("TCP连接失败: {}", e))?;

        // 创建TLS连接器
        let tls = if cfg!(debug_assertions) {
            TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .danger_accept_invalid_hostnames(true)
                .build()
        } else {
            TlsConnector::builder().build()
        }.map_err(|e| format!("TLS创建失败: {}", e))?;

        // 升级到TLS
        let mut tls_stream = tls.connect(&self.account.imap_server, stream)
            .map_err(|e| format!("TLS连接失败: {}", e))?;

        // 读取欢迎信息
        let mut buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取欢迎信息失败: {}", e))?;

        // 发送ID命令
        let id_cmd = b"A001 ID (\"name\" \"MailFlow\" \"version\" \"1.0\")\r\n";
        tls_stream.write_all(id_cmd).map_err(|e| format!("发送ID命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        buffer = [0u8; 1024];
        tls_stream.read(&mut buffer).map_err(|e| format!("读取ID响应失败: {}", e))?;

        // 发送LOGIN命令
        let login_cmd = format!("A002 LOGIN \"{}\" \"{}\"\r\n", self.account.email, self.password);
        tls_stream.write_all(login_cmd.as_bytes()).map_err(|e| format!("发送LOGIN命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer2 = [0u8; 1024];
        let n = tls_stream.read(&mut buffer2).map_err(|e| format!("读取LOGIN响应失败: {}", e))?;
        let response = String::from_utf8_lossy(&buffer2[..n]);
        if response.contains("NO") || response.contains("BAD") {
            return Err(format!("163邮箱登录失败: {}", response));
        }

        // 选择文件夹
        let select_cmd = format!("A003 SELECT \"{}\"\r\n", folder);
        tls_stream.write_all(select_cmd.as_bytes()).map_err(|e| format!("发送SELECT命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer3 = [0u8; 2048];
        tls_stream.read(&mut buffer3).map_err(|e| format!("读取SELECT响应失败: {}", e))?;

        // 复制邮件
        let copy_cmd = format!("A004 UID COPY {} \"{}\"\r\n", uid, dest_folder);
        tls_stream.write_all(copy_cmd.as_bytes()).map_err(|e| format!("发送COPY命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer4 = [0u8; 1024];
        tls_stream.read(&mut buffer4).map_err(|e| format!("读取COPY响应失败: {}", e))?;

        // 标记删除
        let store_cmd = format!("A005 UID STORE {} +FLAGS (\\Deleted)\r\n", uid);
        tls_stream.write_all(store_cmd.as_bytes()).map_err(|e| format!("发送STORE命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer5 = [0u8; 1024];
        tls_stream.read(&mut buffer5).map_err(|e| format!("读取STORE响应失败: {}", e))?;

        // EXPUNGE
        let expunge_cmd = b"A006 EXPUNGE\r\n";
        tls_stream.write_all(expunge_cmd).map_err(|e| format!("发送EXPUNGE命令失败: {}", e))?;
        tls_stream.flush().map_err(|e| format!("刷新失败: {}", e))?;

        let mut buffer6 = [0u8; 1024];
        tls_stream.read(&mut buffer6).map_err(|e| format!("读取EXPUNGE响应失败: {}", e))?;

        // 发送LOGOUT
        let _ = tls_stream.write_all(b"A007 LOGOUT\r\n");
        let _ = tls_stream.flush();

        Ok(())
    }
}
