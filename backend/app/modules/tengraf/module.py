import asyncio
from datetime import datetime
import time
import logging

from app.modules.base import BaseModule
from app.modules.tengraf.schemas import TengrafScanInput
from app.modules.tengraf.scrapers.darknet_feed import darknet_feed
from app.modules.tengraf.scrapers.leak_detector import leak_detector
from app.modules.tengraf.extractors.entity_extractor import extract_entities
from app.modules.tengraf.scoring.threat_scorer import score_threat
from app.modules.tengraf.config import TENGRAF_KEYWORDS
from app.services.kz_intelligence import kz_intelligence, screen_text
from app.modules.shared.graph.enhanced_analytics import build_temporal_timeline

logger = logging.getLogger(__name__)


def classify_crime_category(item: dict, entities: dict) -> str:
    text = f"{item.get('title', '')} {item.get('text', '')}".lower()

    if any(x in text for x in ["bank logs", "kaspi logs", "fullz", "database", "db dump", "leak"]):
        return "DATA_LEAK"

    if any(x in text for x in ["drop card", "drop cards", "дроп карта", "дроп карты", "дроппер", "cashout", "обнал"]):
        return "DROPPER_NETWORK"

    if any(x in text for x in ["1win", "mostbet", "betwinner", "illegal betting", "casino", "betting users"]):
        return "ILLEGAL_BETTING"

    if any(x in text for x in ["guaranteed profit", "guaranteed returns", "20%", "20 percent", "финансовая пирамида", "пассивный доход", "investment scam", "ponzi"]):
        return "PYRAMID_SCHEME"

    if entities.get("wallets") and entities.get("telegram_handles"):
        return "CRYPTO_FINANCIAL_CRIME"

    return "OSINT_FINDING"


def build_analyst_summary(item: dict, entities: dict, category: str) -> str:
    title = item.get("title") or "TENGRAF finding"
    banks = entities.get("banks") or []
    wallets = entities.get("wallets") or []
    telegram = entities.get("telegram_handles") or []
    domains = entities.get("domains") or []
    platforms = entities.get("platforms") or []

    parts = [f"{title} was classified as {category.replace('_', ' ').title()}."]

    if banks:
        parts.append(f"Detected Kazakhstan banking references: {', '.join(banks)}.")

    if wallets:
        parts.append(f"Detected crypto wallet indicators: {len(wallets)} wallet(s).")

    if telegram:
        parts.append(f"Detected Telegram contact/channel indicators: {', '.join(telegram[:3])}.")

    if domains:
        parts.append(f"Detected infrastructure domains: {', '.join(domains[:3])}.")

    if platforms:
        parts.append(f"Detected betting/platform references: {', '.join(platforms[:3])}.")

    return " ".join(parts)


def build_recommended_actions(category: str, entities: dict, risk_score: int) -> list[str]:
    actions = []

    if risk_score >= 85:
        actions.append("Escalate immediately for analyst review.")
    elif risk_score >= 70:
        actions.append("Queue as high-priority intelligence finding.")
    elif risk_score >= 40:
        actions.append("Verify manually and monitor for correlation.")
    else:
        actions.append("Keep as low-priority OSINT context.")

    if category == "DATA_LEAK":
        actions.extend([
            "Preserve leak evidence and source URL.",
            "Check whether Kazakhstan banks or citizens are affected.",
            "Prepare breach-intelligence evidence package.",
        ])

    elif category == "DROPPER_NETWORK":
        actions.extend([
            "Map Telegram operators, phone numbers, bank cards, and wallets.",
            "Check overlap with known dropper recruitment channels.",
            "Escalate linked payment instruments for review.",
        ])

    elif category == "ILLEGAL_BETTING":
        actions.extend([
            "Check platform licensing status.",
            "Map domains, mirror links, Telegram funnels, and payment methods.",
            "Prepare blocking or financial-flow review evidence.",
        ])

    elif category == "PYRAMID_SCHEME":
        actions.extend([
            "Check registration status and promoted return claims.",
            "Estimate audience reach and victim exposure.",
            "Preserve promotional posts as evidence.",
        ])

    elif category == "CRYPTO_FINANCIAL_CRIME":
        actions.extend([
            "Send extracted wallets to wallet intelligence workflow.",
            "Check Telegram-to-wallet attribution.",
            "Preserve source evidence for chain-analysis correlation.",
        ])

    if entities.get("wallets"):
        actions.append("Run wallet clustering and transaction-risk enrichment.")

    if entities.get("telegram_handles"):
        actions.append("Capture Telegram evidence screenshots and message links.")

    return actions


def evidence_priority(category: str, risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if category in ["DATA_LEAK", "DROPPER_NETWORK", "ILLEGAL_BETTING"]:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


class TengrafModule(BaseModule):
    module_id = "tengraf"
    module_name = "ТЕНЬGRAF"
    module_version = "1.1.0"
    module_description = (
        "DarkNet and open-web intelligence module. Monitors fraud forums, leak boards, "
        "marketplace-style sources, and suspicious public intelligence feeds for Kazakhstan-linked "
        "financial crime indicators."
    )

    def validate_input(self, data: dict) -> bool:
        try:
            TengrafScanInput(**data)
            return True
        except Exception as e:
            logger.warning(f"TENGRAF validation failed: {e}")
            return False

    async def execute(self, data: dict, task_id: str) -> dict:
        start = time.time()

        inp = TengrafScanInput(**data)
        keywords = inp.keywords or TENGRAF_KEYWORDS

        (raw_items, leak_items, watchlist_items) = await asyncio.gather(
            darknet_feed.collect(keywords=keywords, max_items=inp.max_items),
            leak_detector.detect(keywords=keywords, limit=10),
            kz_intelligence.get_watchlist_findings(keywords=keywords),
            return_exceptions=True,
        )
        if isinstance(watchlist_items, Exception):
            watchlist_items = []
        if isinstance(raw_items, Exception):
            raw_items = []
        if isinstance(leak_items, Exception):
            leak_items = []

        # Tag leak findings with DATA_LEAK category before merging
        for li in leak_items:
            li.setdefault("crime_category", "DATA_LEAK")

        # Watchlist items come pre-tagged
        for wi in watchlist_items:
            wi.setdefault("source", "kz_intelligence_feed")
            wi.setdefault("source_type", "watchlist")
            wi.setdefault("title", wi.get("name", "KZ Watchlist Hit"))
            wi.setdefault("text",  wi.get("violation", ""))

        all_items = list(raw_items) + list(leak_items) + list(watchlist_items)

        findings = []

        for item in all_items:
            text = f"{item.get('title', '')} {item.get('text', '')}"
            entities = extract_entities(text)
            score = score_threat(item, entities)

            risk_score = int(score.get("risk_score", 0))
            category = item.get("crime_category") or classify_crime_category(item, entities)

            kz_screen = screen_text(text)

            finding = {
                **item,
                "entities": entities,
                **score,
                "crime_category": category,
                "analyst_summary": build_analyst_summary(item, entities, category),
                "recommended_actions": build_recommended_actions(
                    category,
                    entities,
                    risk_score,
                ),
                "evidence_priority": evidence_priority(category, risk_score),
                "matched_keywords": [
                    kw for kw in keywords if kw.lower() in text.lower()
                ],
                "kz_screening": kz_screen,
                "sanctions_hits": kz_screen.get("hit_count", 0),
            }

            try:
                from app.ml.enrichment import classify_for_finding
                finding["ml_classification"] = classify_for_finding(text)
            except Exception:
                finding["ml_classification"] = {"enabled": False, "reason": "model_not_available"}

            findings.append(finding)

        alerts_fired    = sum(1 for f in findings if f.get("alert_fired"))
        leak_count      = sum(1 for f in findings if f.get("crime_category") == "DATA_LEAK")
        sanctions_count = sum(1 for f in findings if f.get("sanctions_hits", 0) > 0)
        watchlist_count = len(watchlist_items)
        duration     = time.time() - start

        category_counts = {}
        for finding in findings:
            category = finding.get("crime_category", "OSINT_FINDING")
            category_counts[category] = category_counts.get(category, 0) + 1

        temporal_timeline = build_temporal_timeline(findings, date_field="first_seen")

        return {
            "task_id": task_id,
            "mode": "demo" if inp.demo_mode else "live",
            "sources_scanned": len(raw_items) + len(leak_items) + len(watchlist_items),
            "findings": findings,
            "temporal_timeline": temporal_timeline,
            "high_risk_findings": [
                f for f in findings if f.get("risk_score", 0) >= 70
            ],
            "alerts_fired": alerts_fired,
            "category_counts": category_counts,
            "leak_count":      leak_count,
            "sanctions_count": sanctions_count,
            "watchlist_count": watchlist_count,
            "scan_duration_seconds": round(duration, 2),
            "timestamp": datetime.utcnow().isoformat(),
            "collector_status": {
                "darknet": {
                    "enabled": True,
                    "ready": len(raw_items) > 0,
                    "scanned": True,
                    "raw_count": len(raw_items),
                    "error": None,
                },
                "open_web": {
                    "enabled": True,
                    "ready": len(findings) > 0,
                    "scanned": len(raw_items) > 0,
                    "raw_count": len(findings),
                    "error": None,
                },
                "leak_detection": {
                    "enabled": True,
                    "ready": leak_count > 0,
                    "scanned": True,
                    "raw_count": len(leak_items),
                    "error": None,
                },
            },
        }

    def format_output(self, raw_result: dict) -> dict:
        raw_result["formatted_at"] = datetime.utcnow().isoformat()
        raw_result["module"] = self.module_id
        return raw_result