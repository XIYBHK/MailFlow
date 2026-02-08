use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub accounts: Vec<String>,
    pub default_account_id: Option<String>,
    pub ai_config: AiConfig,
    pub ui_config: UiConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            accounts: Vec::new(),
            default_account_id: None,
            ai_config: AiConfig::default(),
            ui_config: UiConfig::default(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AiConfig {
    pub zhipu_api_key: Option<String>,
    pub zhipu_api_base: String,
    pub zhipu_model: String,
    pub auto_classify: bool,
    pub auto_summarize: bool,
    pub summary_language: String,
}

impl Default for AiConfig {
    fn default() -> Self {
        Self {
            zhipu_api_key: None,
            zhipu_api_base: "https://open.bigmodel.cn/api/paas/v4/".to_string(),
            zhipu_model: "glm-4.7".to_string(),
            auto_classify: false,
            auto_summarize: false,
            summary_language: "zh".to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UiConfig {
    pub theme: String,
    pub language: String,
    pub emails_per_page: u32,
    pub show_preview: bool,
    pub font_size: u32,
}

impl Default for UiConfig {
    fn default() -> Self {
        Self {
            theme: "light".to_string(),
            language: "zh".to_string(),
            emails_per_page: 50,
            show_preview: true,
            font_size: 14,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterRule {
    pub id: String,
    pub name: String,
    pub conditions: Vec<FilterCondition>,
    pub actions: Vec<FilterAction>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterCondition {
    pub field: FilterField,
    pub operator: FilterOperator,
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FilterField {
    From,
    To,
    Subject,
    Body,
    Date,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FilterOperator {
    Contains,
    NotContains,
    Equals,
    NotEquals,
    Regex,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FilterAction {
    MoveToFolder(String),
    MarkAsRead,
    MarkAsStarred,
    Delete,
    AddTag(String),
}
