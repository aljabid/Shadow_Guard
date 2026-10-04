import asyncio
from datetime import datetime
import time
import logging

from app.modules.base import BaseModule
from app.modules.kolkhoz.schemas import ExchangeWatchInput
from app.modules.kolkhoz.scoring.risk_engine import RiskEngine
from app.modules.kolkhoz.playback.raks_dataset import get_raks_playback
from app.modules.kolkhoz.config import WATCHED_EXCHANGES
from app.services.sources.source_normalizer import normalize_source
from app.services.blockchain.wallet_intelligence import wallet_intelligence

logger = logging.getLogger(__name__)


SUPPLEMENTAL_EXCHANGES = [
    {
        "name": "RAKS Exchange",
        "domain": "raks.exchange",
        "telegram_channels": ["raks_support", "raks_exchange"],
        "wallets": [],
    },
    {
        "name": "KaspEx OTC",
        "domain": "kaspex-otc.kz",
        "telegram_channels": ["kaspex_otc", "kaspex_support"],
        "wallets": [],
    },
    {
        "name": "NomadSwap",
        "domain": "nomadswap.kz",
        "telegram_channels": ["nomadswap_kz"],
        "wallets": [],
    },
    {
        "name": "AltynCoin Exchange",
        "domain": "altyncoin.io",
        "telegram_channels": ["altyncoin_support"],
        "wallets": [],
    },
    {
        "name": "FastChange Market",
        "domain": "fastchange-market.com",
        "telegram_channels": ["fastchange_market"],
        "wallets": [],
    },
    {
        "name": "CryptoBridge KZ",
        "domain": "cryptobridge-kz.net",
        "telegram_channels": ["cryptobridge_kz"],
        "wallets": [],
    },
]


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def build_url(value: str) -> str:
    if not value:
        return ""

    value = str(value).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if value.startswith("@"):
        return f"https://t.me/{value[1:]}"

    if "." in value:
        return f"https://{value}"

    return f"https://t.me/{value}"


def unique_list(items) -> list:
    seen = set()
    output = []

    for item in items or []:
        if not item:
            continue

        clean = str(item).strip()

        if not clean:
            continue

        key = clean.lower()

        if key not in seen:
            seen.add(key)
            output.append(clean)

    return output


def merge_exchange_watchlist() -> list:
    merged = []
    seen = set()

    for exchange in list(WATCHED_EXCHANGES or []) + SUPPLEMENTAL_EXCHANGES:
        name = str(exchange.get("name") or "").strip()

        if not name:
            continue

        key = name.lower()

        if key in seen:
            continue

        seen.add(key)
        merged.append(exchange)

    return merged


def get_risk_level(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def get_exchange_category(result: dict) -> str:
    score = safe_int(result.get("risk_score"), 0)

    if score >= 85:
        return "COLLAPSE_RISK_EXCHANGE"
    if score >= 70:
        return "PRE_COLLAPSE_WARNING"
    if score >= 40:
        return "EXCHANGE_WATCHLIST"
    return "HEALTHY_EXCHANGE_MONITORING"


def get_health_status(score: int) -> str:
    if score >= 85:
        return "COLLAPSE RISK"
    if score >= 70:
        return "CRITICAL WARNING"
    if score >= 40:
        return "WATCHLIST"
    return "HEALTHY"


def get_collapse_probability(score: int) -> int:
    if score >= 85:
        return min(98, max(85, score - 2))
    if score >= 70:
        return min(84, max(70, score - 4))
    if score >= 40:
        return min(69, max(35, score - 6))
    return max(5, min(25, score + 3))


def get_confidence(score: int, signals: list) -> str:
    if score >= 70:
        return "High"

    if len(signals or []) >= 3:
        return "Medium"

    return "Medium"


def signal_name(signal: dict) -> str:
    return (
        signal.get("name")
        or signal.get("signal")
        or signal.get("type")
        or signal.get("label")
        or "unknown_signal"
    )


def signal_score(signal: dict) -> int:
    return safe_int(
        signal.get("score")
        or signal.get("value")
        or signal.get("points")
        or signal.get("weighted_score")
        or 0
    )


def build_risk_drivers(result: dict) -> list[str]:
    drivers = []

    for signal in result.get("signals") or []:
        if not isinstance(signal, dict):
            continue

        name = signal_name(signal)
        score = signal_score(signal)

        readable = name.replace("_", " ").title()

        if score > 0:
            drivers.append(f"{readable} contributed +{score} risk points.")
        else:
            drivers.append(f"{readable} currently shows no abnormal activity.")

    if not drivers:
        drivers = [
            "No major withdrawal complaint surge detected.",
            "No confirmed support silence detected.",
            "No abnormal wallet outflow spike detected.",
            "No major social channel deletion detected.",
        ]

    return drivers[:6]


def build_recommended_actions(result: dict) -> list[str]:
    score = safe_int(result.get("risk_score"), 0)

    if score >= 85:
        actions = ["Escalate immediately for AFM analyst review."]
    elif score >= 70:
        actions = ["Queue as high-priority pre-collapse exchange warning."]
    elif score >= 40:
        actions = ["Continue enhanced monitoring and verify evidence sources."]
    else:
        actions = ["Continue passive monitoring and re-evaluate in 24 hours."]

    actions.extend(
        [
            "Track withdrawal complaints and support-channel availability.",
            "Monitor exchange wallet outflows and suspicious consolidation.",
            "Preserve domain, Telegram, and forum evidence links.",
        ]
    )

    return actions


def build_analyst_summary(result: dict) -> str:
    name = result.get("exchange_name") or "Unknown exchange"
    score = safe_int(result.get("risk_score"), 0)
    level = get_risk_level(score)
    health = get_health_status(score)
    probability = get_collapse_probability(score)

    summary = (
        f"{name} is classified as {health}. "
        f"Current KOLKHOZ risk score is {score}/100 with {level} severity. "
        f"Estimated collapse probability is {probability}%. "
    )

    if score >= 70:
        summary += (
            "Multiple pre-collapse indicators are active, including complaint, "
            "support, infrastructure, or wallet-flow signals."
        )
    elif score >= 40:
        summary += (
            "Some warning indicators are present, but the exchange has not yet "
            "crossed the critical intervention threshold."
        )
    else:
        summary += (
            "No major pre-collapse pattern is currently detected. Monitoring should continue."
        )

    return summary


def evidence_priority(score: int) -> str:
    if score >= 85:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 40:
        return "medium"
    return "low"


def enrich_exchange_result(result: dict, exchange: dict | None = None) -> dict:
    exchange = exchange or {}

    exchange_name = (
        result.get("exchange_name")
        or result.get("name")
        or exchange.get("name")
        or "Unknown exchange"
    )

    domain = result.get("domain") or exchange.get("domain")

    telegram_channels = (
        result.get("telegram_channels")
        or exchange.get("telegram_channels")
        or []
    )

    wallets = result.get("wallet_addresses") or exchange.get("wallets") or []

    urls = []

    if domain:
        urls.append(build_url(domain))

    for ch in telegram_channels:
        urls.append(build_url(ch))

    urls = unique_list(urls)
    source_url = urls[0] if urls else None

    risk_score = safe_int(result.get("risk_score"), 0)
    risk_level = result.get("risk_level") or get_risk_level(risk_score)
    exchange_category = get_exchange_category({**result, "risk_score": risk_score})
    probability = get_collapse_probability(risk_score)

    enriched = {
        **result,
        "exchange_name": exchange_name,
        "source_url": source_url,
        "evidence_urls": urls,
        "domain": domain,
        "telegram_channels": telegram_channels,
        "wallet_addresses": wallets,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "exchange_category": exchange_category,
        "crime_category": "SHADOW_EXCHANGE_COLLAPSE_RISK",
        "health_status": get_health_status(risk_score),
        "collapse_probability": probability,
        "confidence": get_confidence(risk_score, result.get("signals") or []),
        "evidence_priority": evidence_priority(risk_score),
        "risk_drivers": build_risk_drivers(result),
        "recommended_actions": build_recommended_actions(
            {**result, "risk_score": risk_score}
        ),
        "analyst_summary": build_analyst_summary(
            {**result, "exchange_name": exchange_name, "risk_score": risk_score}
        ),
        "last_updated": datetime.utcnow().isoformat(),
        "alert_fired": bool(result.get("alert_fired")) or risk_score >= 70,
    }

    source_data = normalize_source(
        source_type="exchange_intelligence",
        source_name=exchange_name,
        source_url=source_url,
        evidence_urls=urls,
        telegram_links=[u for u in urls if "t.me/" in u],
        web_links=[u for u in urls if "t.me/" not in u],
        wallets=wallets,
        raw_excerpt=enriched.get("analyst_summary", "")[:2000],
        metadata={
            "exchange_name": exchange_name,
            "domain": domain,
            "telegram_channels": telegram_channels,
            "wallets": wallets,
            "risk_score": risk_score,
            "risk_level": risk_level,
            "health_status": enriched["health_status"],
            "collapse_probability": probability,
            "exchange_category": exchange_category,
        },
    )

    enriched["source_data"] = source_data

    try:
        from app.ml.enrichment import classify_for_finding
        ml_text = " ".join(filter(None, [
            enriched.get("analyst_summary", ""),
            enriched.get("exchange_name", ""),
            " ".join(str(s) for s in (enriched.get("signals") or [])),
        ]))
        enriched["ml_classification"] = classify_for_finding(ml_text)
    except Exception:
        enriched["ml_classification"] = {"enabled": False, "reason": "model_not_available"}

    return enriched


class KolkhozModule(BaseModule):
    module_id = "kolkhoz"
    module_name = "KOLKHOZ"
    module_version = "1.1.0"
    module_description = (
        "Pre-collapse shadow exchange signal engine. Monitors darknet forums, "
        "Telegram channels, and blockchain flows for early warning signals of "
        "shadow crypto exchange collapse — tuned for the CIS criminal ecosystem."
    )

    def validate_input(self, data: dict) -> bool:
        try:
            ExchangeWatchInput(**data)
            return True
        except Exception as e:
            logger.warning(f"KOLKHOZ input validation failed: {e}")
            return False

    async def execute(self, data: dict, task_id: str) -> dict:
        start = time.time()
        inp = ExchangeWatchInput(**data)

        # Collect all wallet addresses across exchanges for multi-chain intelligence
        all_wallets: list[str] = list(inp.wallet_addresses or [])

        if inp.demo_mode or inp.playback_mode:
            raw_results = await get_raks_playback()

            results = [
                enrich_exchange_result(
                    r,
                    {
                        "name": r.get("exchange_name") or "RAKS Exchange",
                        "domain": r.get("domain") or "raks.exchange",
                        "telegram_channels": r.get("telegram_channels")
                        or ["raks_support"],
                        "wallets": r.get("wallet_addresses") or [],
                    },
                )
                for r in raw_results
            ]

        else:
            engine = RiskEngine()
            exchanges = merge_exchange_watchlist()

            if inp.exchange_name:
                exchanges = [
                    e
                    for e in exchanges
                    if inp.exchange_name.lower() in e["name"].lower()
                ]

            results = []

            for exchange in exchanges:
                channels = inp.telegram_channels or exchange.get(
                    "telegram_channels", []
                )
                wallets  = inp.wallet_addresses or exchange.get("wallets", [])
                domain   = inp.domain or exchange.get("domain")
                all_wallets.extend(wallets)

                result = await engine.score_exchange(
                    exchange_name=exchange["name"],
                    telegram_channels=channels,
                    wallet_addresses=wallets,
                    domain=domain,
                )

                result["telegram_channels"] = channels
                result["wallet_addresses"]  = wallets
                result["domain"] = domain

                results.append(enrich_exchange_result(result, exchange))

        # Run multi-chain wallet intelligence in parallel with result enrichment
        wallet_intel = await wallet_intelligence.analyze(
            addresses=list(set(all_wallets)),
            keywords=[],
        )

        duration = time.time() - start

        alerts_fired = sum(1 for r in results if r.get("alert_fired", False))

        category_counts = {}

        for item in results:
            category = item.get("exchange_category", "EXCHANGE_MONITORING")
            category_counts[category] = category_counts.get(category, 0) + 1

        high_risk_exchanges = [
            r for r in results if safe_int(r.get("risk_score"), 0) >= 70
        ]

        dirty_count  = wallet_intel.get("dirty_wallets", 0)
        p2p_count    = wallet_intel.get("p2p_bridges", 0)
        wallet_count = wallet_intel.get("wallets_analyzed", 0)

        return {
            "task_id": task_id,
            "mode": "demo" if (inp.demo_mode or inp.playback_mode) else "live",
            "results": results,
            "total_exchanges_scanned": len(results),
            "high_risk_exchanges": len(high_risk_exchanges),
            "alerts_fired": alerts_fired,
            "category_counts": category_counts,
            "scan_duration_seconds": round(duration, 2),
            "wallet_intelligence": wallet_intel,
            "dirty_wallets_detected": dirty_count,
            "p2p_bridges_detected":   p2p_count,
            "collector_status": {
                "telegram": {
                    "enabled": True,
                    "ready": len(results) > 0,
                    "scanned": True,
                    "raw_count": sum(len(r.get("telegram_channels") or []) for r in results),
                    "error": None,
                },
                "domain": {
                    "enabled": True,
                    "ready": len(results) > 0,
                    "scanned": len(results) > 0,
                    "raw_count": sum(1 for r in results if r.get("domain")),
                    "error": None,
                },
                "crypto": {
                    "enabled": True,
                    "ready": wallet_count > 0,
                    "scanned": wallet_count > 0,
                    "raw_count": wallet_count,
                    "error": None if not dirty_count else f"{dirty_count} dirty wallet(s) detected",
                },
            },
        }

    def format_output(self, raw_result: dict) -> dict:
        raw_result["formatted_at"] = datetime.utcnow().isoformat()
        raw_result["module"] = self.module_id
        return raw_result