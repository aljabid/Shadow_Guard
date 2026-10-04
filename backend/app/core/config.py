from pydantic_settings import BaseSettings
from typing import Optional, List


class Settings(BaseSettings):
    APP_ENV: str = "development"
    APP_NAME: str = "ShadowGuard"
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: str = "change-this-secret-key-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]

    POSTGRES_USER: str = "shadowguard"
    POSTGRES_PASSWORD: str = "shadowguard_dev_password"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "shadowguard"

    @property
    def DATABASE_URL(self) -> str:
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def SYNC_DATABASE_URL(self) -> str:
        return (
            f"postgresql://{self.POSTGRES_USER}:"
            f"{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:"
            f"{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    REDIS_URL: str = "redis://localhost:6379/0"
    ELASTICSEARCH_URL: str = "http://localhost:9200"

    MINIO_USER: str = "shadowguard"
    MINIO_PASSWORD: str = "shadowguard_minio_dev"
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_BUCKET: str = "evidence-packages"

    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # Telegram
    TELEGRAM_API_ID: Optional[str] = None
    TELEGRAM_API_HASH: Optional[str] = None
    TELEGRAM_SESSION_STRING: Optional[str] = None
    TELEGRAM_PHONE: Optional[str] = None
    TELEGRAM_SESSION: Optional[str] = None

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4o-mini"

    # Google Gemini
    GEMINI_API_KEY: Optional[str] = None

    # Search APIs
    BRAVE_SEARCH_API_KEY: Optional[str] = None
    SERPAPI_API_KEY: Optional[str] = None

    # Blockchain
    TRONGRID_API_KEY: Optional[str] = None
    ETHERSCAN_API_KEY: Optional[str] = None
    BSCSCAN_API_KEY: Optional[str] = None
    TRONSCAN_API_KEY: Optional[str] = None
    AIFC_API_KEY: Optional[str] = None
    EGOV_API_KEY: Optional[str] = None

    # Domain / OSINT
    SECURITYTRAILS_API_KEY: Optional[str] = None
    SHODAN_API_KEY: Optional[str] = None
    VIRUSTOTAL_API_KEY: Optional[str] = None
    ABUSEIPDB_API_KEY: Optional[str] = None
    HIBP_API_KEY: Optional[str] = None

    # Darknet / Tor
    TOR_PROXY: str = "socks5://127.0.0.1:9050"

    # Module toggles
    KOLKHOZ_ENABLED: bool = True
    DROPER_ENABLED: bool = True
    PIRAMIDA_ENABLED: bool = True
    SHADOWBET_ENABLED: bool = True
    TENGRAF_ENABLED: bool = True
    CONTRABAND_ENABLED: bool = True

    # Scan behaviour
    ENABLE_LIVE_COLLECTION: bool = True
    DEFAULT_SCAN_MODE: str = "live"
    ENABLE_PLAYBACK_DATA: bool = True

    # Storage paths
    REPORT_STORAGE_PATH: str = "./storage/reports"
    EVIDENCE_STORAGE_PATH: str = "./storage/evidence"

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()
