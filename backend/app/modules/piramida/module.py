from app.modules.base import BaseModule
from app.modules.piramida.schemas import PiramidaScanInput
from app.modules.piramida.scrapers.telegram_scraper import piramida_telegram_scraper
from app.modules.piramida.scrapers.channel_searcher import piramida_channel_searcher
from app.modules.piramida.scoring.pyramid_scorer import pyramid_scorer
from app.modules.piramida.cases.amir_capital_dataset import get_amir_playback
from app.modules.piramida.enrichment.victim_estimator import victim_estimator
from app.modules.piramida.config import INVESTMENT_SEED_CHANNELS
from app.services.sources.source_normalizer import normalize_source

from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def build_telegram_url(channel_name: str) -> str:
    value = str(channel_name or "").strip()

    if not value:
        return ""

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if value.startswith("@"):
        value = value[1:]

    return f"https://t.me/{value}"


def classify_pyramid_scheme(result: dict) -> str:
    promised_return = safe_float(result.get("promised_return_max"), 0)
    registered = bool(result.get("is_registered", False))
    text = str(result).lower()

    if promised_return >= 100:
        return "EXTREME_RETURN_PYRAMID"

    if promised_return >= 20:
        return "HIGH_YIELD_INVESTMENT_SCHEME"

    if not registered and promised_return >= 5:
        return "UNREGISTERED_INVESTMENT_SCHEME"

    if any(x in text for x in ["referral", "invite", "команда", "партнер", "реферал"]):
        return "REFERRAL_RECRUITMENT_SCHEME"

    if any(x in text for x in ["guaranteed", "гарант", "пассивный доход", "без риска"]):
        return "GUARANTEED_PROFIT_SCHEME"

    return "SUSPICIOUS_INVESTMENT_CONTENT"


def evidence_priority(risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def build_red_flags(result: dict) -> list[str]:
    flags = []

    promised_return = safe_float(result.get("promised_return_max"), 0)
    registered = bool(result.get("is_registered", False))

    if promised_return:
        flags.append(f"Promised return detected: {promised_return}%/month.")

    if promised_return >= 20:
        flags.append("Unrealistic monthly return exceeds normal investment-risk thresholds.")

    if not registered:
        flags.append("Scheme is not registered or registration could not be verified.")

    if safe_int(result.get("estimated_victims"), 0) > 0:
        flags.append(f"Estimated victims: {safe_int(result.get('estimated_victims')):,}.")

    if safe_int(result.get("estimated_funds_at_risk_kzt"), 0) > 0:
        flags.append(
            f"Estimated funds at risk: {safe_int(result.get('estimated_funds_at_risk_kzt')):,} KZT."
        )

    if not flags:
        flags.append("Flagged by investment/pyramid scoring indicators.")

    return flags


def build_analyst_summary(result: dict, category: str) -> str:
    name = (
        result.get("scheme_name")
        or result.get("channel")
        or result.get("title")
        or "Investment scheme"
    )

    risk = safe_int(result.get("risk_score"), 0)
    promised_return = safe_float(result.get("promised_return_max"), 0)
    victims = safe_int(result.get("estimated_victims"), 0)
    funds = safe_int(result.get("estimated_funds_at_risk_kzt"), 0)
    registered = bool(result.get("is_registered", False))

    summary = (
        f"{name} was classified as {category.replace('_', ' ').title()}. "
        f"Current pyramid risk score is {risk}/100. "
    )

    if promised_return:
        summary += f"The scheme promotes up to {promised_return}% monthly return. "

    summary += "Registration status: registered. " if registered else "Registration status: not verified / not registered. "

    if victims:
        summary += f"Estimated exposed victims: {victims:,}. "

    if funds:
        summary += f"Estimated funds at risk: {funds:,} KZT. "

    return summary.strip()


def build_recommended_actions(result: dict, category: str) -> list[str]:
    risk = safe_int(result.get("risk_score"), 0)
    actions = []

    if risk >= 85:
        actions.append("Escalate immediately for AFM analyst review.")
    elif risk >= 70:
        actions.append("Queue as high-priority pyramid investigation.")
    elif risk >= 40:
        actions.append("Verify manually and continue monitoring.")
    else:
        actions.append("Keep as low-priority investment OSINT context.")

    actions.extend(
        [
            "Preserve Telegram channel, posts, and promotional evidence.",
            "Check registration status against official financial service registries.",
            "Extract administrators, domains, wallets, phone numbers, and payment routes.",
        ]
    )

    if category in ["EXTREME_RETURN_PYRAMID", "HIGH_YIELD_INVESTMENT_SCHEME"]:
        actions.append("Prioritize victim exposure estimation and fund-flow analysis.")

    if category == "REFERRAL_RECRUITMENT_SCHEME":
        actions.append("Map referral tree, recruiter accounts, and audience growth.")

    return actions


def enrich_scheme_result(result: dict, channel_name: str) -> dict:
    telegram_url = build_telegram_url(channel_name)

    risk_score = safe_int(
        result.get("risk_score")
        or result.get("score")
        or result.get("final_score")
        or 0
    )

    category = classify_pyramid_scheme(result)

    source_data = normalize_source(
        source_type="telegram",
        source_name=channel_name or "investment_scheme_source",
        source_url=telegram_url,
        evidence_urls=[telegram_url] if telegram_url else [],
        telegram_links=[telegram_url] if telegram_url else [],
        raw_excerpt=str(result)[:2000],
        metadata={
            "channel": channel_name,
            "risk_score": risk_score,
            "scheme_name": result.get("scheme_name"),
            "promised_return_max": result.get("promised_return_max"),
            "is_registered": result.get("is_registered"),
            "scheme_category": category,
        },
    )

    enriched = {
        **result,
        "channel": channel_name,
        "source_url": telegram_url,
        "evidence_urls": [telegram_url] if telegram_url else [],
        "source_data": source_data,
        "risk_score": risk_score,
        "scheme_category": category,
        "crime_category": "PYRAMID_SCHEME",
        "evidence_priority": evidence_priority(risk_score),
        "red_flags": build_red_flags(result),
        "analyst_summary": build_analyst_summary(result, category),
        "recommended_actions": build_recommended_actions(result, category),
    }

    try:
        from app.ml.enrichment import classify_for_finding
        ml_text = " ".join(filter(None, [
            enriched.get("analyst_summary", ""),
            enriched.get("scheme_name", ""),
            str(enriched.get("promised_return_max", "")),
            " ".join(str(f) for f in (enriched.get("red_flags") or [])),
        ]))
        enriched["ml_classification"] = classify_for_finding(ml_text)
    except Exception:
        enriched["ml_classification"] = {"enabled": False, "reason": "model_not_available"}

    return enriched


class PiramidaModule(BaseModule):
    module_id = "piramida"
    module_name = "ПИРАМИДА"
    module_version = "1.1.0"
    module_description = (
        "Financial pyramid early warning system. Detects pyramid schemes "
        "on Kazakh and Russian social platforms using NLP return-rate extraction, "
        "registry validation, and on-chain analysis."
    )

    def validate_input(self, data: dict) -> bool:
        try:
            PiramidaScanInput(**data)
            return True
        except Exception as e:
            logger.warning(f"PIRAMIDA validation failed: {e}")
            return False

    async def execute(self, data: dict, task_id: str) -> dict:
        start = time.time()
        inp = PiramidaScanInput(**data)

        if inp.demo_mode or inp.playback_mode:
            results = await get_amir_playback()

            results = [
                enrich_scheme_result(
                    r,
                    r.get("channel")
                    or r.get("username")
                    or r.get("scheme_name")
                    or "amir_capital",
                )
                for r in results
            ]

            duration = time.time() - start

            return {
                "task_id": task_id,
                "mode": "demo",
                "schemes_detected": len(results),
                "high_risk_schemes": sum(
                    1 for r in results if safe_int(r.get("risk_score"), 0) >= 70
                ),
                "total_estimated_victims": sum(
                    safe_int(r.get("estimated_victims"), 0) for r in results
                ),
                "total_funds_at_risk_kzt": sum(
                    safe_int(r.get("estimated_funds_at_risk_kzt"), 0)
                    for r in results
                ),
                "results": results,
                "alerts_fired": sum(
                    1 for r in results if r.get("alert_fired", False)
                ),
                "category_counts": self._category_counts(results),
                "scan_duration_seconds": round(duration, 2),
                "collector_status": {
                    "telegram": {
                        "enabled": True,
                        "ready": len(results) > 0,
                        "scanned": True,
                        "raw_count": len(results),
                        "error": None,
                    },
                },
            }

        seeds = inp.seed_channels or INVESTMENT_SEED_CHANNELS

        discovered = await piramida_channel_searcher.discover(
            seeds,
            inp.max_channels,
        )

        results = []

        for channel in discovered:
            channel_name = channel.get("username") or channel.get("title", "")

            if not channel_name:
                continue

            scraped = await piramida_telegram_scraper.scrape_and_analyze(
                channel_name
            )

            if not scraped.get("has_investment_content"):
                continue

            score_result = await pyramid_scorer.score(scraped)

            member_count = (
                channel.get("participants_count")
                or channel.get("member_count")
                or scraped.get("participants_count")
                or scraped.get("member_count")
                or 0
            )

            victim_data = victim_estimator.estimate(
                member_count=member_count,
                inflow_usdt=scraped.get("wallet_inflow_usdt", 0),
            )

            scheme = {
                **score_result,
                "channel": channel_name,
                "scheme_name": score_result.get("scheme_name") or channel_name,
                "member_count": member_count,
                "estimated_victims": victim_data["estimated_victims"],
                "estimated_funds_at_risk_kzt": victim_data[
                    "estimated_funds_kzt"
                ],
            }

            results.append(enrich_scheme_result(scheme, channel_name))

        duration = time.time() - start

        return {
            "task_id": task_id,
            "mode": "live",
            "schemes_detected": len(results),
            "high_risk_schemes": sum(
                1 for r in results if safe_int(r.get("risk_score"), 0) >= 70
            ),
            "total_estimated_victims": sum(
                safe_int(r.get("estimated_victims"), 0) for r in results
            ),
            "total_funds_at_risk_kzt": sum(
                safe_int(r.get("estimated_funds_at_risk_kzt"), 0)
                for r in results
            ),
            "results": results,
            "alerts_fired": sum(
                1 for r in results if r.get("alert_fired", False)
            ),
            "category_counts": self._category_counts(results),
            "scan_duration_seconds": round(duration, 2),
            "collector_status": {
                "telegram": {
                    "enabled": True,
                    "ready": len(results) > 0,
                    "scanned": True,
                    "raw_count": len(discovered),
                    "error": None,
                },
            },
        }

    def _category_counts(self, results: list[dict]) -> dict:
        counts = {}

        for item in results:
            category = item.get("scheme_category", "SUSPICIOUS_INVESTMENT_CONTENT")
            counts[category] = counts.get(category, 0) + 1

        return counts

    def format_output(self, raw_result: dict) -> dict:
        raw_result["formatted_at"] = datetime.utcnow().isoformat()
        raw_result["module"] = self.module_id
        return raw_result