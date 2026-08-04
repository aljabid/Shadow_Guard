from typing import List
from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter
from app.modules.piramida.nlp.vocabulary import INVESTMENT_KEYWORDS
import logging

logger = logging.getLogger(__name__)


class PiramidaChannelSearcher:
    async def discover(self, seeds: List[str], max_channels: int = 30) -> List[dict]:
        discovered = {}
        for seed in seeds:
            info = await telegram_base.get_channel_info(seed)
            if info:
                discovered[seed] = {"username": seed, **info, "source": "seed"}
        for term in INVESTMENT_KEYWORDS[:4]:
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


piramida_channel_searcher = PiramidaChannelSearcher()
