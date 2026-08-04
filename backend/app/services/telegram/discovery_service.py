from typing import List, Dict, Any
from app.services.telegram.channel_validator import validate_public_channel
from app.services.telegram.message_scraper import scrape_public_messages


DEFAULT_DISCOVERY_SEEDS = [
    "easydropz",
    "techdrop",
    "Dropershoper",
    "forcedropofficial",
    "droperoptdrop_chat",
    "invest_kz",
    "crypto_invest_kz",
    "time_to_invest_channel",
    "1win_kazakhstan",
    "mostbet_kz",
    "betwinner_kz",
]


class TelegramDiscoveryService:
    async def discover_public_channels(
        self,
        seeds: List[str] | None = None,
        limit: int = 20,
        include_messages: bool = False,
        message_limit: int = 50,
    ) -> List[Dict[str, Any]]:
        seeds = seeds or DEFAULT_DISCOVERY_SEEDS
        discovered = []

        for seed in seeds[:limit]:
            info = await validate_public_channel(seed)

            if not info:
                continue

            if include_messages:
                info["messages"] = await scrape_public_messages(
                    info["username"],
                    limit=message_limit,
                )

            discovered.append(info)

        return discovered


telegram_discovery_service = TelegramDiscoveryService()