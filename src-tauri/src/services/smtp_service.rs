use crate::models::EmailAccount;
use lettre::{
    message::{header, Mailbox, MultiPart, SinglePart},
    transport::smtp::authentication::Credentials,
    Message, SmtpTransport, Transport,
};

pub struct SmtpService {
    account: EmailAccount,
}

impl SmtpService {
    pub fn new(account: EmailAccount) -> Self {
        Self { account }
    }

    fn create_transport(&self) -> SmtpTransport {
        let creds = Credentials::new(
            self.account.email.clone(),
            self.account.password.clone(),
        );

        SmtpTransport::relay(&self.account.smtp_server)
            .unwrap()
            .port(self.account.smtp_port)
            .credentials(creds)
            .build()
    }

    pub fn send_email(
        &self,
        to: Vec<String>,
        subject: &str,
        body: &str,
        is_html: bool,
    ) -> Result<(), String> {
        let from_mailbox: Mailbox = self.account.email
            .parse()
            .map_err(|e| format!("发件人邮箱格式错误: {}", e))?;

        let mut email_builder = Message::builder()
            .from(from_mailbox)
            .subject(subject);

        for addr in &to {
            let mailbox: Mailbox = addr
                .parse()
                .map_err(|e| format!("收件人邮箱格式错误: {}", e))?;
            email_builder = email_builder.to(mailbox);
        }

        let email = if is_html {
            let multipart = MultiPart::alternative()
                .singlepart(
                    SinglePart::builder()
                        .header(header::ContentType::TEXT_PLAIN)
                        .body(String::from("请使用支持HTML的邮件客户端查看此邮件")),
                )
                .singlepart(
                    SinglePart::builder()
                        .header(header::ContentType::TEXT_HTML)
                        .body(body.to_string()),
                );

            email_builder
                .multipart(multipart)
                .map_err(|e| format!("构建邮件失败: {}", e))?
        } else {
            email_builder
                .singlepart(
                    SinglePart::builder()
                        .header(header::ContentType::TEXT_PLAIN)
                        .body(body.to_string()),
                )
                .map_err(|e| format!("构建邮件失败: {}", e))?
        };

        let mailer = self.create_transport();
        mailer
            .send(&email)
            .map_err(|e| format!("发送邮件失败: {}", e))?;

        Ok(())
    }

    pub fn test_connection(&self) -> Result<(), String> {
        let mailer = self.create_transport();
        mailer
            .test_connection()
            .map_err(|e| format!("SMTP连接测试失败: {}", e))?;
        Ok(())
    }
}
