use crate::services::{AiService, StorageService};
use tauri::State;

pub type StorageState<'a> = State<'a, std::sync::Arc<StorageService>>;

#[tauri::command]
pub async fn classify_email_ai(
    subject: String,
    from: String,
    body: String,
    storage: StorageState<'_>,
) -> Result<String, String> {
    let config = storage.get_config()?;

    let api_key = config.ai_config.zhipu_api_key
        .ok_or("请先在设置中配置智谱AI API密钥")?;

    let ai_service = AiService::new(
        api_key,
        config.ai_config.zhipu_api_base,
        config.ai_config.zhipu_model,
    );

    ai_service.classify_email(&subject, &from, &body).await
}

#[tauri::command]
pub async fn summarize_email(
    content: String,
    language: String,
    storage: StorageState<'_>,
) -> Result<String, String> {
    let config = storage.get_config()?;

    let api_key = config.ai_config.zhipu_api_key
        .ok_or("请先在设置中配置智谱AI API密钥")?;

    let ai_service = AiService::new(
        api_key,
        config.ai_config.zhipu_api_base,
        config.ai_config.zhipu_model,
    );

    ai_service.summarize_email(&content, &language).await
}

#[tauri::command]
pub async fn translate_text(
    text: String,
    target_lang: String,
    storage: StorageState<'_>,
) -> Result<String, String> {
    let config = storage.get_config()?;

    let api_key = config.ai_config.zhipu_api_key
        .ok_or("请先在设置中配置智谱AI API密钥")?;

    let ai_service = AiService::new(
        api_key,
        config.ai_config.zhipu_api_base,
        config.ai_config.zhipu_model,
    );

    ai_service.translate(&text, &target_lang).await
}

#[tauri::command]
pub async fn generate_reply(
    subject: String,
    from: String,
    body: String,
    storage: StorageState<'_>,
) -> Result<String, String> {
    let config = storage.get_config()?;

    let api_key = config.ai_config.zhipu_api_key
        .ok_or("请先在设置中配置智谱AI API密钥")?;

    let ai_service = AiService::new(
        api_key,
        config.ai_config.zhipu_api_base,
        config.ai_config.zhipu_model,
    );

    ai_service.generate_reply_suggestion(&subject, &from, &body).await
}

#[tauri::command]
pub async fn extract_key_info(
    email_body: String,
    storage: StorageState<'_>,
) -> Result<String, String> {
    let config = storage.get_config()?;

    let api_key = config.ai_config.zhipu_api_key
        .ok_or("请先在设置中配置智谱AI API密钥")?;

    let ai_service = AiService::new(
        api_key,
        config.ai_config.zhipu_api_base,
        config.ai_config.zhipu_model,
    );

    ai_service.extract_key_info(&email_body).await
}

#[tauri::command]
pub async fn set_ai_api_key(
    api_key: String,
    storage: StorageState<'_>,
) -> Result<(), String> {
    storage.update_ai_api_key(&api_key)
}

#[tauri::command]
pub async fn get_ai_config(storage: StorageState<'_>) -> Result<crate::models::AiConfig, String> {
    let config = storage.get_config()?;
    Ok(config.ai_config)
}
