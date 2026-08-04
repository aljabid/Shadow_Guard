from app.modules.shared.scrapers.telegram_base import telegram_base
from app.modules.shared.scrapers.rate_limiter import rate_limiter
from app.modules.shared.nlp.russian_preprocessor import extract_crypto_addresses
from app.modules.piramida.nlp.return_extractor import return_extractor
from app.modules.piramida.nlp.investment_classifier import investment_classifier
from app.modules.piramida.nlp.referral_detector import detect_referral_structure
from app.modules.piramida.nlp.urgency_detector import detect_urgency
import logging

logger = logging.getLogger(__name__)


class PiramidaTelegramScraper:
    async def scrape_and_analyze(self, channel: str) -> dict:
        await rate_limiter.telegram()
        messages = await telegram_base.get_channel_messages(channel, limit=100)
        info = await telegram_base.get_channel_info(channel)
        invest_messages = investment_classifier.batch_classify(messages)
        if not invest_messages:
            return {"channel": channel, "has_investment_content": False,
                    "member_count": info.get("participants_count", 0) if info else 0}
        all_text = " ".join(m.get("text", "") for m in invest_messages)
        returns = return_extractor.extract(all_text)
        max_monthly = return_extractor.get_max_monthly_return(all_text)
        referral = detect_referral_structure(all_text)
        urgency = detect_urgency(all_text)
        wallets = list(set(extract_crypto_addresses(all_text)))
        member_count = info.get("participants_count", 0) if info else 0
        weekly_growth = 0
        if len(messages) >= 2:
            from datetime import datetime
            try:
                first_date = datetime.fromisoformat(messages[-1].get("date", ""))
                last_date = datetime.fromisoformat(messages[0].get("date", ""))
                days_span = max((last_date - first_date).days, 1)
                weekly_growth = int((member_count / days_span) * 7)
            except Exception:
                weekly_growth = 0
        return {
            "channel": channel, "has_investment_content": True,
            "member_count": member_count, "investment_messages": len(invest_messages),
            "return_promises": returns, "max_monthly_return": max_monthly,
            "referral_analysis": referral, "urgency_analysis": urgency,
            "wallet_addresses": wallets, "wallet_count": len(wallets),
            "weekly_growth_estimate": weekly_growth, "wallet_inflow_usdt": 0,
        }


piramida_telegram_scraper = PiramidaTelegramScraper()
