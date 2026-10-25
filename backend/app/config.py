from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    frontend_origin: str = "http://localhost:3000"
    themealdb_key: str = "1"  # TheMealDB's free test key; put a supporter key in .env if you ever need one
    model_config = SettingsConfigDict(env_file=".env")


settings = Settings()