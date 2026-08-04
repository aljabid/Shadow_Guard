from typing import List
from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter
from app.modules.droper.nlp.recruitment_classifier import recruitment_classifier
from app.modules.droper.nlp.entity_extractor import extract_phone_numbers, extract_telegram_handles, extract_banks_mentioned, extract_payout_amounts
import logging

logger = logging.getLogger(__name__)


class DroperTelegramScraper:
    async def scrape_and_classify(self, channel: str, limit: int = 200) -> dict:
        await rate_limiter.telegram()
        messages = await telegram_base.get_channel_messages(channel, limit=limit)
        info = await telegram_base.get_channel_info(channel)
        flagged = recruitment_classifier.batch_classify(messages)
        all_phones, all_handles, all_banks, all_payouts = [], [], [], []
        for msg in flagged:
            text = msg.get("text", "")
            all_phones.extend(extract_phone_numbers(text))
            all_handles.extend(extract_telegram_handles(text))
            all_banks.extend(extract_banks_mentioned(text))
            all_payouts.extend(extract_payout_amounts(text))
        avg_payout = round(sum(p["amount"] for p in all_payouts) / len(all_payouts), 2) if all_payouts else None
        return {
            "channel": channel,
            "member_count": info.get("participants_count", 0) if info else 0,
            "total_messages": len(messages),
            "recruitment_post_count": len(flagged),
            "flagged_posts": flagged,
            "phones_extracted": list(set(all_phones)),
            "handles_extracted": list(set(all_handles)),
            "banks_mentioned": list(set(all_banks)),
            "avg_payout": avg_payout,
        }


droper_telegram_scraper = DroperTelegramScraper()
