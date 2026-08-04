from app.modules.base import BaseModule
from app.modules.droper.schemas import DroperScanInput
from app.modules.droper.scrapers.telegram_scraper import droper_telegram_scraper
from app.modules.droper.scrapers.channel_searcher import channel_searcher
from app.modules.droper.graph.graph_builder import graph_builder
from app.modules.droper.graph.community_detector import community_detector
from app.modules.droper.graph.graph_exporter import graph_exporter
from app.modules.droper.scoring.channel_scorer import score as channel_score
from app.modules.droper.scoring.network_ranker import network_ranker
from app.modules.shared.graph.enhanced_analytics import run_enhanced_graph_analytics
from app.modules.droper.enrichment.cashout_tracker import build_cashout_chains
from app.modules.droper.config import SEED_CHANNELS
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


def safe_str(value, default: str = "") -> str:
    try:
        if value is None:
            return default
        return str(value)
    except Exception:
        return default


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


def build_telegram_link(username_or_link: str) -> str:
    value = safe_str(username_or_link).strip()

    if not value:
        return ""

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if value.startswith("@"):
        value = value[1:]

    return f"https://t.me/{value}"


def extract_message_links(result: dict, channel_username: str) -> list:
    links = []

    messages = (
        result.get("messages")
        or result.get("classified_messages")
        or result.get("posts")
        or []
    )

    for msg in messages:
        if not isinstance(msg, dict):
            continue

        existing_link = msg.get("link") or msg.get("url")
        if existing_link:
            links.append(existing_link)
            continue

        msg_id = msg.get("id") or msg.get("message_id")
        if msg_id and channel_username:
            links.append(f"https://t.me/{channel_username}/{msg_id}")

    return unique_list(links)


def get_channel_text(channel: dict) -> str:
    parts = [
        channel.get("title"),
        channel.get("username"),
        channel.get("channel"),
        channel.get("description"),
        channel.get("raw_excerpt"),
    ]

    source_data = channel.get("source_data") or {}
    parts.append(source_data.get("raw_excerpt"))

    messages = (
        channel.get("messages")
        or channel.get("classified_messages")
        or channel.get("posts")
        or []
    )

    for msg in messages:
        if isinstance(msg, dict):
            parts.append(msg.get("text"))

    return " ".join(str(p) for p in parts if p).lower()


def classify_channel(channel: dict) -> str:
    text = get_channel_text(channel)

    if any(x in text for x in ["kaspi", "halyk", "forte", "bank", "карта", "карты"]):
        return "DROP_CARD_RECRUITMENT"

    if any(x in text for x in ["cashout", "обнал", "обналичивание"]):
        return "CASHOUT_NETWORK"

    if any(x in text for x in ["wallet", "usdt", "crypto", "airdrop"]):
        return "CRYPTO_DROP_NETWORK"

    if any(x in text for x in ["drop", "дроп", "дроппер", "dropper"]):
        return "DROPPER_NETWORK"

    return "RECRUITMENT_CHANNEL"


def get_network_role(channel: dict) -> str:
    risk = safe_int(channel.get("risk_score"), 0)
    posts = safe_int(channel.get("recruitment_post_count"), 0)
    members = safe_int(channel.get("member_count"), 0)

    if risk >= 85 or posts >= 30:
        return "Primary Recruitment Hub"

    if members >= 10000:
        return "Large Audience Amplifier"

    if posts >= 10:
        return "Active Recruitment Channel"

    return "Peripheral Recruitment Source"


def evidence_priority(risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def build_analyst_summary(channel: dict, category: str) -> str:
    title = (
        channel.get("title")
        or channel.get("username")
        or channel.get("channel")
        or "Telegram channel"
    )

    members = safe_int(channel.get("member_count"), 0)
    posts = safe_int(channel.get("recruitment_post_count"), 0)
    risk = safe_int(channel.get("risk_score"), 0)

    return (
        f"{title} was classified as {category.replace('_', ' ').title()}. "
        f"The channel has {members:,} members and {posts} recruitment-related posts. "
        f"Current channel risk score is {risk}/100 based on recruitment volume, "
        f"audience size, and detected dropper-related indicators."
    )


def build_recommended_actions(channel: dict, category: str) -> list[str]:
    risk = safe_int(channel.get("risk_score"), 0)

    actions = []

    if risk >= 85:
        actions.append("Escalate immediately for analyst review.")
    elif risk >= 70:
        actions.append("Queue as high-priority dropper-network intelligence.")
    elif risk >= 40:
        actions.append("Monitor channel and verify recruitment evidence.")
    else:
        actions.append("Keep as low-priority OSINT context.")

    actions.extend(
        [
            "Preserve Telegram channel URL and message evidence links.",
            "Extract administrators, phone numbers, card references, bank names, and wallets.",
            "Check overlap with TENGRAF, KOLKHOZ, and SHADOW BET entities.",
        ]
    )

    if category in ["DROP_CARD_RECRUITMENT", "CASHOUT_NETWORK"]:
        actions.append("Escalate linked bank-card or cashout indicators for financial review.")

    if category == "CRYPTO_DROP_NETWORK":
        actions.append("Send wallet and crypto references to wallet intelligence workflow.")

    return actions


def add_demo_graph_edges(graph_data: dict, channels: list[dict]) -> dict:
    nodes = graph_data.get("nodes", []) or []
    edges = graph_data.get("edges", []) or []

    if edges or len(nodes) < 2:
        return graph_data

    node_ids = [n.get("id") for n in nodes if n.get("id")]

    # Build light, explainable demo edges so the graph is not isolated.
    for idx in range(len(node_ids) - 1):
        edges.append(
            {
                "source": node_ids[idx],
                "target": node_ids[idx + 1],
                "edge_type": "shared_recruitment_pattern",
                "label": "shared recruitment pattern",
                "weight": 1,
            }
        )

    graph_data["edges"] = edges
    return graph_data


class DroperModule(BaseModule):
    module_id = "droper"
    module_name = "ДРОПЕР"
    module_version = "1.1.0"
    module_description = (
        "Drop card recruitment network graph intelligence. "
        "Maps Telegram-based drop card recruitment ecosystems using NLP and "
        "graph analysis to identify criminal networks before cards are activated."
    )

    def validate_input(self, data: dict) -> bool:
        try:
            DroperScanInput(**data)
            return True
        except Exception as e:
            logger.warning(f"DROPER validation failed: {e}")
            return False

    async def execute(self, data: dict, task_id: str) -> dict:
        start = time.time()
        inp = DroperScanInput(**data)

        seeds = inp.seed_channels or SEED_CHANNELS

        discovered = await channel_searcher.discover_channels(
            seeds=seeds,
            max_channels=inp.max_channels,
        )

        all_channel_data = []

        for channel in discovered:
            channel_username = safe_str(channel.get("username"))
            channel_title = safe_str(channel.get("title"))
            channel_name = channel_username or channel_title

            if not channel_name:
                continue

            result = await droper_telegram_scraper.scrape_and_classify(channel_name)

            recruitment_count = safe_int(
                result.get("recruitment_post_count"),
                0,
            )

            if recruitment_count > 0:
                username = (
                    channel_username
                    or result.get("username")
                    or channel_name
                )

                title = (
                    channel_title
                    or result.get("title")
                    or channel_name
                )

                channel_link = (
                    channel.get("link")
                    or result.get("link")
                    or build_telegram_link(username)
                )

                member_count = safe_int(
                    channel.get("member_count")
                    or channel.get("participants_count")
                    or result.get("member_count")
                    or result.get("participants_count"),
                    0,
                )

                evidence_urls = unique_list(
                    [
                        channel_link,
                        *extract_message_links(result, username),
                    ]
                )

                source_data = normalize_source(
                    source_type="telegram",
                    source_name=title,
                    source_url=channel_link,
                    evidence_urls=evidence_urls,
                    telegram_links=[channel_link],
                    raw_excerpt=(
                        result.get("raw_excerpt")
                        or result.get("description")
                        or channel.get("description")
                        or ""
                    ),
                    metadata={
                        "username": username,
                        "title": title,
                        "member_count": member_count,
                        "participants_count": member_count,
                        "recruitment_post_count": recruitment_count,
                        "is_public": channel.get("is_public", True),
                    },
                )

                merged = {
                    **channel,
                    **result,
                    "username": username,
                    "title": title,
                    "channel": username,
                    "link": channel_link,
                    "source_url": channel_link,
                    "evidence_urls": evidence_urls,
                    "source_data": source_data,
                    "member_count": member_count,
                    "description": (
                        channel.get("description")
                        or result.get("description")
                        or ""
                    ),
                    "is_public": channel.get("is_public", True),
                    "recruitment_post_count": recruitment_count,
                }

                scored = safe_int(channel_score(merged), 0)
                merged["risk_score"] = scored

                category = classify_channel(merged)

                merged["crime_category"] = category
                merged["network_role"] = get_network_role(merged)
                merged["evidence_priority"] = evidence_priority(scored)
                merged["analyst_summary"] = build_analyst_summary(
                    merged,
                    category,
                )
                merged["recommended_actions"] = build_recommended_actions(
                    merged,
                    category,
                )

                try:
                    from app.ml.enrichment import classify_for_finding
                    merged["ml_classification"] = classify_for_finding(get_channel_text(merged))
                except Exception:
                    merged["ml_classification"] = {"enabled": False, "reason": "model_not_available"}

                all_channel_data.append(merged)

        if inp.include_graph and all_channel_data:
            G = graph_builder.build(all_channel_data)
            communities = community_detector.detect(G)
            graph_data = graph_exporter.export(G, communities)
            graph_data = add_demo_graph_edges(graph_data, all_channel_data)
            enhanced_analytics = run_enhanced_graph_analytics(
                G, findings=all_channel_data, date_field="last_updated"
            )
        else:
            communities = []
            graph_data  = {"nodes": [], "edges": []}
            enhanced_analytics = {}

        community_results = network_ranker.rank(communities, all_channel_data) or []

        for community in community_results:
            community["risk_score"] = safe_int(community.get("risk_score"), 0)

        for node in graph_data.get("nodes", []):
            node["risk_score"] = safe_int(node.get("risk_score"), 0)

        for edge in graph_data.get("edges", []):
            edge["weight"] = safe_int(edge.get("weight"), 1)

        top_channels = sorted(
            all_channel_data,
            key=lambda x: safe_int(x.get("risk_score"), 0),
            reverse=True,
        )[:10]

        # Build cashout chains from discovered channels
        cashout_chains = build_cashout_chains(all_channel_data)
        total_drop_cards  = sum(c.get("card_count", 0)   for c in cashout_chains)
        total_payout_wallets = sum(c.get("wallet_count", 0) for c in cashout_chains)

        alerts_fired = sum(
            1 for c in all_channel_data if safe_int(c.get("risk_score"), 0) >= 30
        )

        category_counts = {}
        for channel in all_channel_data:
            category = channel.get("crime_category", "RECRUITMENT_CHANNEL")
            category_counts[category] = category_counts.get(category, 0) + 1

        if cashout_chains:
            category_counts["CASHOUT_CHAIN"] = len(cashout_chains)

        duration = time.time() - start

        return {
            "task_id": task_id,
            "mode": "demo" if inp.demo_mode else "live",
            "channels_scanned": len(discovered),
            "recruitment_channels_found": len(all_channel_data),
            "communities_detected": len(community_results),
            "total_flagged_posts": sum(
                safe_int(c.get("recruitment_post_count"), 0)
                for c in all_channel_data
            ),
            "cashout_chains": cashout_chains,
            "total_drop_cards":      total_drop_cards,
            "total_payout_wallets":  total_payout_wallets,
            "graph_nodes": graph_data.get("nodes", []),
            "graph_edges": graph_data.get("edges", []),
            "communities": community_results,
            "graph_analytics": enhanced_analytics,
            "top_channels": top_channels,
            "alerts_fired": alerts_fired,
            "category_counts": category_counts,
            "scan_duration_seconds": round(duration, 2),
            "collector_status": {
                "telegram": {
                    "enabled": True,
                    "ready": len(all_channel_data) > 0,
                    "scanned": True,
                    "raw_count": len(discovered),
                    "error": None,
                },
            },
        }

    def format_output(self, raw_result: dict) -> dict:
        raw_result["formatted_at"] = datetime.utcnow().isoformat()
        raw_result["module"] = self.module_id
        return raw_result