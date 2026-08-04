from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter
from app.modules.shared.nlp.russian_preprocessor import extract_domains, extract_crypto_addresses
from app.modules.shadowbet.scrapers.affiliate_scraper import extract_affiliate_codes
from app.modules.shadowbet.config import GAMBLING_KEYWORDS, ILLEGAL_PLATFORM_NAMES
import logging

logger = logging.getLogger(__name__)


class ShadowBetTelegramScraper:
    async def scrape_and_analyze(self, channel: str) -> dict:
        await rate_limiter.telegram()
        messages = await telegram_base.get_channel_messages(channel, limit=150)
        info = await telegram_base.get_channel_info(channel)
        gambling_messages = [m for m in messages if any(kw in m.get("text", "").lower() for kw in GAMBLING_KEYWORDS)]
        if not gambling_messages:
            return {"channel": channel, "has_gambling_content": False,
                    "member_count": info.get("participants_count", 0) if info else 0}
        all_text = " ".join(m.get("text", "") for m in gambling_messages)
        domains = list(set(extract_domains(all_text)))
        wallets = list(set(extract_crypto_addresses(all_text)))
        affiliate_codes = extract_affiliate_codes(all_text)
        platforms = list(set(p for p in ILLEGAL_PLATFORM_NAMES if p.lower() in all_text.lower()))
        payment_methods = self._extract_payment_methods(all_text)
        return {
            "channel": channel, "has_gambling_content": True,
            "member_count": info.get("participants_count", 0) if info else 0,
            "gambling_post_count": len(gambling_messages),
            "total_messages": len(messages),
            "domains_found": domains, "wallet_addresses": wallets,
            "affiliate_codes": affiliate_codes, "platforms_mentioned": platforms,
            "payment_methods": payment_methods,
        }

    def _extract_payment_methods(self, text: str) -> list:
        text_lower = text.lower()
        methods = []
        payment_keywords = {
            "kaspi": "Kaspi Pay", "qiwi": "QIWI", "usdt": "USDT",
            "bitcoin": "Bitcoin", "btc": "Bitcoin", "visa": "Visa",
            "mastercard": "Mastercard", "мобильный баланс": "Mobile Balance",
            "mobile balance": "Mobile Balance",
        }
        for kw, label in payment_keywords.items():
            if kw in text_lower and label not in methods:
                methods.append(label)
        return methods


shadowbet_telegram_scraper = ShadowBetTelegramScraper()
