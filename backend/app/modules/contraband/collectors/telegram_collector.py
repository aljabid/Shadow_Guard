from datetime import datetime
from typing import Dict, List
import logging

from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)

# Search terms used to discover contraband channels on Telegram
CONTRABAND_SEARCH_TERMS = [
    "закладки доставка",
    "курьер алматы",
    "кладмен работа",
    "наркотики казахстан",
    "вейп доставка",
]

# Known seed channels to bootstrap discovery
CONTRABAND_SEED_CHANNELS = [
    "forcedropofficial",
    "easydropz",
    "Dropershoper",
]


async def collect_telegram_sources(input_data: Dict | None = None) -> List[Dict]:
    input_data = input_data or {}
    max_channels = int(input_data.get("max_channels", 10) or 10)
    max_messages = int(input_data.get("max_messages_per_channel", 30) or 30)

    # --- Channel discovery ---
    discovered: dict[str, bool] = {}

    # Try seed channels first
    for seed in CONTRABAND_SEED_CHANNELS:
        if len(discovered) >= max_channels:
            break
        info = await telegram_base.get_channel_info(seed)
        if info:
            discovered[seed] = True

    # Keyword search to find more channels
    for term in CONTRABAND_SEARCH_TERMS:
        if len(discovered) >= max_channels:
            break
        await rate_limiter.telegram()
        results = await telegram_base.search_channels(term)
        for r in results:
            username = r.get("username")
            if username and username not in discovered:
                discovered[username] = True
            if len(discovered) >= max_channels:
                break

    # Also honour any channels passed in by the caller
    for ch in (input_data.get("telegram_channels") or []):
        ch = ch.lstrip("@").strip().lstrip("https://t.me/").strip("/")
        if ch and ch not in discovered:
            discovered[ch] = True

    channels = list(discovered.keys())[:max_channels]
    logger.info(f"CONTRABAND: collecting from {len(channels)} Telegram channels")

    # --- Message collection ---
    collected: List[Dict] = []

    for channel in channels:
        try:
            messages = await telegram_base.get_channel_messages(channel, limit=max_messages)
            for msg in messages:
                text = msg.get("text", "")
                if not text.strip():
                    continue
                collected.append({
                    "source_type": "telegram",
                    "source_name": channel,
                    "source_url": f"https://t.me/{channel}/{msg.get('id', 0)}",
                    "title": f"Telegram post from @{channel}",
                    "text": text,
                    "language": None,
                    "collected_at": datetime.utcnow().isoformat(),
                    "metadata": {
                        "collector": "telegram_collector",
                        "collection_mode": "live",
                        "channel": channel,
                        "message_id": msg.get("id"),
                        "date": msg.get("date"),
                        "views": msg.get("views"),
                    },
                })
        except Exception as exc:
            logger.warning(f"CONTRABAND: failed to collect from {channel}: {exc}")

    logger.info(f"CONTRABAND: collected {len(collected)} messages from Telegram")
    return collected
