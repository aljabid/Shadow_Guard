from typing import List, Optional
from datetime import datetime
from app.modules.kolkhoz.scoring.signal_weights import SIGNAL_WEIGHTS, get_risk_level
from app.modules.kolkhoz.scrapers.telegram_scraper import kolkhoz_telegram_scraper, search_exchange_channels
from app.modules.kolkhoz.scrapers.domain_monitor import domain_monitor
from app.modules.kolkhoz.scrapers.bot_monitor import bot_monitor
from app.modules.kolkhoz.blockchain.wallet_monitor import wallet_monitor
from app.modules.kolkhoz.blockchain.flow_analyzer import analyze_outflow_velocity
from app.modules.kolkhoz.nlp.sentiment_analyzer import compute_sentiment_trend
import logging

logger = logging.getLogger(__name__)


class RiskEngine:
    async def score_exchange(self, exchange_name: str, telegram_channels: List[str],
                             wallet_addresses: List[str], domain: Optional[str] = None) -> dict:
        signals = {}
        raw_scores = {}

        try:
            # If no channels configured, search Telegram for exchange-related channels
            active_channels = list(telegram_channels)
            if not active_channels:
                active_channels = await search_exchange_channels(exchange_name)
            tg_result = await kolkhoz_telegram_scraper.scrape_and_classify(active_channels, limit=100)
            sentiment = compute_sentiment_trend(tg_result["classified_messages"])
            complaint_rate = sentiment["complaint_rate"]
            trend = sentiment["trend"]
            multiplier = 120 if trend == "spike" else 90 if trend == "increasing" else 60
            raw_scores["complaint_surge"] = min(complaint_rate * multiplier, 100)
            signals["complaint_surge"] = {
                "raw_score": raw_scores["complaint_surge"],
                "complaint_rate": complaint_rate,
                "trend": trend,
                "complaint_count": sentiment.get("complaint_count", 0),
            }
        except Exception as e:
            logger.error(f"Telegram signal error: {e}")
            raw_scores["complaint_surge"] = 0

        try:
            if telegram_channels:
                bot_result = await bot_monitor.check_support_channel(telegram_channels[0])
                silence = bot_result.get("signal") == "silent"
                hours_ago = bot_result.get("last_message_hours_ago") or 0
                raw_scores["support_silence"] = min(hours_ago * 8, 100) if silence else 0
                signals["support_silence"] = bot_result
            else:
                raw_scores["support_silence"] = 0
        except Exception as e:
            logger.error(f"Support silence signal error: {e}")
            raw_scores["support_silence"] = 0

        try:
            wallet_result = await wallet_monitor.monitor_wallets(wallet_addresses)
            flow_analysis = analyze_outflow_velocity(wallet_result.get("wallet_results", []))
            raw_scores["wallet_outflow_drop"] = flow_analysis["signal_strength"] * 100
            signals["wallet_outflow_drop"] = {**flow_analysis, "wallets_checked": wallet_result["wallets_checked"]}
        except Exception as e:
            logger.error(f"Wallet signal error: {e}")
            raw_scores["wallet_outflow_drop"] = 0

        try:
            if domain:
                domain_result = await domain_monitor.check_domain(domain)
                is_down = domain_result["status"] in ("offline", "timeout", "error")
                raw_scores["domain_downtime"] = 100 if is_down else 0
                signals["domain_downtime"] = domain_result
            else:
                raw_scores["domain_downtime"] = 0
        except Exception as e:
            logger.error(f"Domain signal error: {e}")
            raw_scores["domain_downtime"] = 0

        raw_scores["social_deletion"] = 0
        signals["social_deletion"] = {"note": "manual_check_required"}

        final_score = round(min(sum(raw_scores.get(k, 0) * w for k, w in SIGNAL_WEIGHTS.items()), 100), 1)

        signal_details = [
            {
                "signal_name": sig_name,
                "score": round(raw_scores.get(sig_name, 0), 1),
                "weight": weight,
                "weighted_score": round(raw_scores.get(sig_name, 0) * weight, 1),
                "details": signals.get(sig_name, {}),
            }
            for sig_name, weight in SIGNAL_WEIGHTS.items()
        ]

        return {
            "exchange_name": exchange_name,
            "risk_score": final_score,
            "risk_level": get_risk_level(final_score),
            "signals": signal_details,
            "complaint_count": signals.get("complaint_surge", {}).get("complaint_count", 0),
            "wallet_outflow_delta": raw_scores.get("wallet_outflow_drop"),
            "domain_status": signals.get("domain_downtime", {}).get("status"),
            "alert_fired": final_score >= 65,
            "timestamp": datetime.utcnow().isoformat(),
        }


risk_engine = RiskEngine()
