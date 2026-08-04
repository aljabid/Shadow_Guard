"""
API Key Loader — reads integration credentials from the api_integrations table.

Each Celery task calls `await api_key_loader.refresh(db)` at startup so that
any key saved via Settings → API Integrations is picked up at runtime.
All shared clients (TelegramBase, TronClient, EthClient, TorConnector, etc.)
call `api_key_loader.get(name, field, fallback)` instead of reading settings
directly, with environment-variable settings as the final fallback.
"""

import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


class APIKeyLoader:
    def __init__(self) -> None:
        self._cache: dict[str, dict] = {}

    async def refresh(self, db: AsyncSession) -> None:
        """Load all enabled integrations from the DB into the in-memory cache."""
        try:
            from app.models.api_integration import ApiIntegration

            result = await db.execute(
                select(ApiIntegration).where(ApiIntegration.is_enabled == True)
            )
            integrations = result.scalars().all()
            self._cache = {i.name: (i.config or {}) for i in integrations}
            configured = [n for n, cfg in self._cache.items() if any(v for v in cfg.values() if v)]
            if configured:
                logger.info(f"API keys loaded from DB: {configured}")
        except Exception as exc:
            logger.warning(f"api_key_loader.refresh failed (using env fallback): {exc}")

    def get(self, integration_name: str, field: str, fallback: str | None = None) -> str | None:
        """Return configured value from DB cache, or fallback if not set."""
        value = self._cache.get(integration_name, {}).get(field)
        return value if value else fallback

    def get_int(self, integration_name: str, field: str, fallback: int = 0) -> int:
        raw = self.get(integration_name, field)
        try:
            return int(raw) if raw else fallback
        except (TypeError, ValueError):
            return fallback

    def is_configured(self, integration_name: str) -> bool:
        """Return True if at least one field is non-empty for this integration."""
        cfg = self._cache.get(integration_name, {})
        return bool(cfg and any(v for v in cfg.values() if v))

    def telegram_ready(self) -> bool:
        """True if Telegram API ID + hash are available (DB or env)."""
        from app.core.config import settings
        api_id = self.get("telegram_api", "api_id") or settings.TELEGRAM_API_ID
        api_hash = self.get("telegram_api", "api_hash") or settings.TELEGRAM_API_HASH
        return bool(api_id and api_hash)

    def trongrid_key(self) -> str:
        from app.core.config import settings
        return self.get("trongrid", "api_key") or settings.TRONGRID_API_KEY or ""

    def etherscan_key(self) -> str:
        from app.core.config import settings
        return self.get("etherscan", "api_key") or settings.ETHERSCAN_API_KEY or "YourApiKeyToken"

    def tor_proxy_url(self) -> str | None:
        return self.get("tor_gateway", "proxy_url") or "socks5://127.0.0.1:9050"

    def darknet_crawler_url(self) -> str | None:
        return self.get("darknet_crawler", "endpoint")

    def darknet_crawler_key(self) -> str | None:
        return self.get("darknet_crawler", "api_key")

    def shodan_key(self) -> str | None:
        return self.get("shodan", "api_key")

    def virustotal_key(self) -> str | None:
        return self.get("virustotal", "api_key")

    def google_search_key(self) -> str | None:
        return self.get("google_cse", "api_key")

    def google_search_cx(self) -> str | None:
        return self.get("google_cse", "cx")


# Module-level singleton — shared across the Celery worker process.
api_key_loader = APIKeyLoader()
