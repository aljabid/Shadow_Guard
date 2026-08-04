from typing import List, Dict, Any
from datetime import datetime
import logging

from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter

logger = logging.getLogger(__name__)


COMPLAINT_KEYWORDS = [
    "вывод не работает", "не выводят", "деньги зависли",
    "support молчит", "поддержка молчит", "скам", "обман",
    "заблокировали", "не могу вывести", "withdrawal problem",
    "withdrawal blocked", "can't withdraw", "scam", "frozen funds",
    "не отвечают", "потерял деньги", "кинули", "развод",
    "мошенники", "exit scam", "биржа не работает", "не платят",
]


class KolkhozTelegramScraper:
    async def scrape_and_classify(
        self,
        channels: List[str],
        limit: int = 100,
    ) -> Dict[str, Any]:
        all_messages = []
        classified_messages = []

        for channel in channels:
            clean = channel.replace("@", "").strip()
            await rate_limiter.telegram()
            try:
                messages = await telegram_base.get_channel_messages(clean, limit=limit)
                for msg in messages:
                    text = msg.get("text", "")
                    if not text.strip():
                        continue
                    text_lower = text.lower()
                    matched = [kw for kw in COMPLAINT_KEYWORDS if kw.lower() in text_lower]
                    is_complaint = len(matched) > 0
                    entry = {
                        "channel": clean,
                        "message_id": msg.get("id"),
                        "text": text[:1000],
                        "date": msg.get("date"),
                        "is_complaint": is_complaint,
                        "matched_keywords": matched,
                        "label": "complaint" if is_complaint else "neutral",
                        "confidence": min(len(matched) * 0.3, 1.0) if is_complaint else 0.0,
                    }
                    all_messages.append(entry)
                    classified_messages.append(entry)
            except Exception as exc:
                logger.warning(f"KOLKHOZ: failed to scrape {clean}: {exc}")

        return {
            "messages": all_messages,
            "classified_messages": classified_messages,
            "channels_checked": len(channels),
            "total_messages": len(all_messages),
            "complaint_messages": sum(1 for m in classified_messages if m.get("is_complaint")),
        }


async def search_exchange_channels(exchange_name: str) -> List[str]:
    """Find Telegram channels related to a known exchange name."""
    await rate_limiter.telegram()
    results = await telegram_base.search_channels(exchange_name)
    return [r["username"] for r in results[:3] if r.get("username")]


kolkhoz_telegram_scraper = KolkhozTelegramScraper()