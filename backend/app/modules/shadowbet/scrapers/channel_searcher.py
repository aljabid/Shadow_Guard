from typing import List
from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter
from app.modules.shadowbet.config import GAMBLING_KEYWORDS
import logging

logger = logging.getLogger(__name__)


class ShadowBetChannelSearcher:
    async def discover(self, seeds: List[str], max_channels: int = 50) -> List[dict]:
        discovered = {}
        for seed in seeds:
            info = await telegram_base.get_channel_info(seed)
            if info:
                discovered[seed] = {"username": seed, **info, "source": "seed"}
        for term in GAMBLING_KEYWORDS[:5]:
            await rate_limiter.telegram()
            results = await telegram_base.search_channels(term)
            for r in results:
                username = r.get("username")
                if username and username not in discovered:
                    discovered[username] = {**r, "source": "search"}
                if len(discovered) >= max_channels:
                    break
            if len(discovered) >= max_channels:
                break
        return list(discovered.values())[:max_channels]


shadowbet_channel_searcher = ShadowBetChannelSearcher()
