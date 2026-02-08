use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const ZHIPU_API_TIMEOUT: u64 = 60;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZhipuMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZhipuRequest {
    pub model: String,
    pub messages: Vec<ZhipuMessage>,
    pub temperature: f32,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZhipuResponse {
    pub id: String,
    pub choices: Vec<Choice>,
    pub usage: Usage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Choice {
    pub index: i32,
    pub message: ZhipuMessage,
    pub finish_reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

pub struct AiService {
    api_key: String,
    api_base: String,
    model: String,
    client: Client,
}

impl AiService {
    pub fn new(api_key: String, api_base: String, model: String) -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(ZHIPU_API_TIMEOUT))
            .build()
            .unwrap_or_default();

        Self {
            api_key,
            api_base,
            model,
            client,
        }
    }

    async fn call_api(&self, messages: Vec<ZhipuMessage>, temperature: f32) -> Result<String, String> {
        let request = ZhipuRequest {
            model: self.model.clone(),
            messages,
            temperature,
            max_tokens: Some(2000),
        };

        let url = format!("{}chat/completions", self.api_base);

        let response = self
            .client
            .post(&url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await
            .map_err(|e| format!("API请求失败: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "无法读取错误响应".to_string());
            return Err(format!("API返回错误 [{}]: {}", status, error_text));
        }

        let zhipu_response: ZhipuResponse = response
            .json()
            .await
            .map_err(|e| format!("解析响应失败: {}", e))?;

        if let Some(choice) = zhipu_response.choices.first() {
            Ok(choice.message.content.clone())
        } else {
            Err("API响应中没有返回内容".to_string())
        }
    }

    pub async fn classify_email(
        &self,
        subject: &str,
        from: &str,
        body: &str,
    ) -> Result<String, String> {
        let prompt = format!(
            "请将以下邮件分类为以下类别之一：spam（垃圾邮件）、ads（广告）、subscription（订阅邮件）、work（工作邮件）、personal（个人邮件）、other（其他）。

只返回类别名称，不要返回任何其他内容。

邮件主题: {}
发件人: {}
邮件正文: {}",
            subject, from, body
        );

        let messages = vec![ZhipuMessage {
            role: "user".to_string(),
            content: prompt,
        }];

        self.call_api(messages, 0.3).await
    }

    pub async fn summarize_email(&self, content: &str, language: &str) -> Result<String, String> {
        let lang_instruction = match language {
            "zh" => "请用中文",
            "en" => "Please use English",
            _ => "请用中文",
        };

        let prompt = format!(
            "{}总结以下邮件的主要内容，用3-5句话概括，突出关键信息。

{}",
            lang_instruction, content
        );

        let messages = vec![ZhipuMessage {
            role: "user".to_string(),
            content: prompt,
        }];

        self.call_api(messages, 0.5).await
    }

    pub async fn translate(&self, text: &str, target_lang: &str) -> Result<String, String> {
        let lang_name = match target_lang {
            "zh" => "中文",
            "en" => "英文",
            "ja" => "日文",
            "ko" => "韩文",
            _ => "中文",
        };

        let prompt = format!("请将以下内容翻译成{}：\n\n{}", lang_name, text);

        let messages = vec![ZhipuMessage {
            role: "user".to_string(),
            content: prompt,
        }];

        self.call_api(messages, 0.3).await
    }

    pub async fn generate_reply_suggestion(
        &self,
        original_subject: &str,
        original_from: &str,
        original_body: &str,
    ) -> Result<String, String> {
        let prompt = format!(
            "基于以下邮件内容，生成3条简短、礼貌的回复建议（每条不超过50字）：

原始邮件主题: {}
发件人: {}
内容: {}

请按以下格式输出：
1. [建议1]
2. [建议2]
3. [建议3]",
            original_subject, original_from, original_body
        );

        let messages = vec![ZhipuMessage {
            role: "user".to_string(),
            content: prompt,
        }];

        self.call_api(messages, 0.7).await
    }

    pub async fn extract_key_info(&self, email_body: &str) -> Result<String, String> {
        let prompt = format!(
            "从以下邮件中提取关键信息，包括：重要日期和时间、联系方式、任务或行动项、重要链接。如果某类信息不存在，请标注\"无\"。\n\n邮件内容：\n{}",
            email_body
        );

        let messages = vec![ZhipuMessage {
            role: "user".to_string(),
            content: prompt,
        }];

        self.call_api(messages, 0.3).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_classify_email() {
        let service = AiService::new(
            "test_key".to_string(),
            "https://open.bigmodel.cn/api/paas/v4/".to_string(),
            "glm-4.7".to_string(),
        );

        // 这个测试需要实际的API密钥
        // 在实际使用时应该跳过或mock
    }
}
