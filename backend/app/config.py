from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://huertai:huertai@localhost:5432/huertai"
    photos_directory: str = "photos"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    # "api"  → Anthropic API key (pago por token)
    # "cli"  → claude CLI con suscripción Pro (sin coste de API)
    ai_backend: str = "cli"
    ai_model: str = "claude-haiku-4-5-20251001"
    ai_max_tokens: int = 512
    debug: bool = False
    app_name: str = "HuertAI"

    cors_origins: str = "http://localhost:3000,http://localhost:5173"
    jwt_secret_key: str = "changeme-use-a-long-random-secret-in-production"

    model_config = {"env_file": ".env"}


settings = Settings()
