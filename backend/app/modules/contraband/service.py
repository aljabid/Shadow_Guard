import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

from app.modules.contraband.analyzers.contraband_classifier import (
    build_category_counts,
    build_summary_counts,
    classify_contraband_sources,
)
from app.modules.contraband.collectors.darknet_collector import collect_darknet_sources
from app.modules.contraband.collectors.instagram_collector import collect_instagram_sources
from app.modules.contraband.collectors.marketplace_collector import collect_marketplace_sources
from app.modules.contraband.collectors.telegram_collector import collect_telegram_sources
from app.modules.contraband.collectors.web_collector import collect_web_sources


def _entity_node_id(entity_type: str, value: str) -> str:
    safe = (
        str(value)
        .lower()
        .replace(" ", "_")
        .replace("@", "tg_")
        .replace("/", "_")
        .replace(":", "_")
        .replace(".", "_")
    )
    return f"{entity_type}_{safe}"


def build_demo_sources() -> List[Dict[str, Any]]:
    now = datetime.utcnow()

    return [
        {
            "source_type": "telegram",
            "source_name": "Almaty Courier Market",
            "title": "Courier recruitment channel detected in Almaty",
            "text": (
                "Работа курьером Алматы. Закладки, доставка, оплата USDT. "
                "Требуются кладчики. Contact admin @almaty_kuryer777, "
                "phone +77011234567, payment USDT TRC20 TQ9DemoWalletKZ123456789."
            ),
            "source_url": "https://t.me/demo_almaty_courier",
            "timestamp": (now - timedelta(hours=5)).isoformat(),
        },
        {
            "source_type": "telegram",
            "source_name": "KZ Drop Logistics",
            "title": "Drop courier network advertising fast delivery",
            "text": (
                "Курьерская сеть, тайник, закладка, быстрые выплаты, crypto payment. "
                "Operator @drop_kz_operator, contact +77771230011, BTC bc1qkzdemo8x9dropwallet."
            ),
            "source_url": "https://t.me/demo_kz_drop_logistics",
            "timestamp": (now - timedelta(hours=4)).isoformat(),
        },
        {
            "source_type": "darknet",
            "source_name": "Dark Vendor Board",
            "title": "Darknet vendor listing synthetic substances",
            "text": (
                "mephedrone alpha-pvp synthetic drugs Kazakhstan delivery BTC USDT. "
                "Vendor handle @kz_alpha_vendor, Jabber vendor@darkmail.example, "
                "BTC bc1qdarkvendorkz000000001, onion mirror demoexampleonion.onion."
            ),
            "source_url": "http://demoexampleonion.onion/vendor/kz-alpha",
            "timestamp": (now - timedelta(hours=3)).isoformat(),
        },
        {
            "source_type": "public_web",
            "source_name": "Disposable Vape KZ",
            "title": "Unlicensed disposable vape delivery page",
            "text": (
                "vape delivery Almaty Elf Bar HQD Lost Mary disposable nicotine products. "
                "Order via @vape_almaty_shop, WhatsApp +77085550122, domain disposable-vape-kz.example."
            ),
            "source_url": "https://example.kz/demo-vape-market",
            "timestamp": (now - timedelta(hours=2)).isoformat(),
        },
        {
            "source_type": "instagram",
            "source_name": "Astana Vape Seller",
            "title": "Instagram vape sales account targeting youth",
            "text": (
                "vape astana delivery hqd elfbar lostmary nicotine pods direct message. "
                "Instagram @astana_vape_night, Telegram @astana_vape_admin, phone +77014445566."
            ),
            "source_url": "https://instagram.com/demo_vape_astana",
            "timestamp": (now - timedelta(hours=2, minutes=30)).isoformat(),
        },
        {
            "source_type": "telegram",
            "source_name": "Night Alcohol Delivery",
            "title": "Illegal alcohol night delivery group",
            "text": (
                "алкоголь ночью доставка виски водка коньяк круглосуточная доставка Алматы. "
                "Manager @night_alco_kz, phone +77776667788, Kaspi transfer accepted."
            ),
            "source_url": "https://t.me/demo_alcohol_night",
            "timestamp": (now - timedelta(hours=1, minutes=45)).isoformat(),
        },
        {
            "source_type": "public_web",
            "source_name": "Underground Alcohol Supplier",
            "title": "Counterfeit alcohol supplier listing",
            "text": (
                "контрафактный алкоголь wholesale alcohol supplier liquor network. "
                "Contact seller @alco_wholesale_kz, phone +77019998877, domain underground-alco.example.kz."
            ),
            "source_url": "https://example.kz/demo-alcohol-supplier",
            "timestamp": (now - timedelta(hours=1, minutes=20)).isoformat(),
        },
        {
            "source_type": "telegram",
            "source_name": "Crypto Courier Payments",
            "title": "Courier payment wallet and phone indicators",
            "text": (
                "USDT TRC20 wallet TQ9DemoWalletKZ123 phone +77011234567 courier wanted Kazakhstan. "
                "Telegram @crypto_courier_pay, ETH 0x742d35Cc6634C0532925a3b844Bc454e4438f44e."
            ),
            "source_url": "https://t.me/demo_crypto_courier",
            "timestamp": (now - timedelta(minutes=55)).isoformat(),
        },
    ]


async def safe_collect(
    collector_name: str,
    enabled: bool,
    collector_func,
    input_data: Dict[str, Any],
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    if not enabled:
        return [], {
            "enabled": False,
            "status": "disabled",
            "count": 0,
            "error": None,
        }

    try:
        data = await collector_func(input_data)
        return data or [], {
            "enabled": True,
            "status": "ok",
            "count": len(data or []),
            "error": None,
        }
    except Exception as exc:
        return [], {
            "enabled": True,
            "status": "failed",
            "count": 0,
            "error": str(exc),
        }


def build_contraband_graph(findings: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    nodes: Dict[str, Dict[str, Any]] = {}
    edges: List[Dict[str, Any]] = []

    for index, finding in enumerate(findings):
        finding_id = f"finding_{index}"

        nodes[finding_id] = {
            "id": finding_id,
            "label": finding.get("title", f"Finding {index + 1}")[:45],
            "type": "finding",
            "risk_score": finding.get("risk_score", 0),
            "metadata": {
                "crime_category": finding.get("crime_category"),
                "source_type": finding.get("source_type"),
            },
        }

        category = finding.get("crime_category", "CONTRABAND_INTELLIGENCE")
        category_id = _entity_node_id("category", category)

        nodes.setdefault(
            category_id,
            {
                "id": category_id,
                "label": str(category).replace("_", " "),
                "type": "category",
                "risk_score": finding.get("risk_score", 0),
                "metadata": {},
            },
        )

        edges.append(
            {
                "source": finding_id,
                "target": category_id,
                "label": "classified_as",
                "edge_type": "classification",
                "weight": 1,
            }
        )

        entities = finding.get("entities") or {}

        entity_map = {
            "telegram": entities.get("telegram_handles") or [],
            "phone": entities.get("phones") or [],
            "wallet": entities.get("wallets") or [],
            "domain": entities.get("domains") or [],
            "location": entities.get("locations") or [],
            "substance": entities.get("substances") or [],
            "brand": entities.get("brands") or [],
        }

        for entity_type, values in entity_map.items():
            for value in values:
                node_id = _entity_node_id(entity_type, value)

                nodes.setdefault(
                    node_id,
                    {
                        "id": node_id,
                        "label": str(value),
                        "type": entity_type,
                        "risk_score": finding.get("risk_score", 0),
                        "metadata": {},
                    },
                )

                edges.append(
                    {
                        "source": finding_id,
                        "target": node_id,
                        "label": f"mentions_{entity_type}",
                        "edge_type": entity_type,
                        "weight": 1,
                    }
                )

    return {
        "graph_nodes": list(nodes.values()),
        "graph_edges": edges,
    }


def build_timeline(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    timeline = []

    for index, finding in enumerate(findings):
        timeline.append(
            {
                "id": f"timeline_{index}",
                "timestamp": finding.get("timestamp") or datetime.utcnow().isoformat(),
                "title": finding.get("title", "Contraband intelligence event"),
                "category": finding.get("crime_category", "CONTRABAND_INTELLIGENCE"),
                "risk_score": finding.get("risk_score", 0),
                "source_type": finding.get("source_type", "unknown"),
                "source_url": finding.get("source_url") or finding.get("url"),
            }
        )

    return sorted(timeline, key=lambda item: item.get("risk_score", 0), reverse=True)


def build_risk_distribution(findings: List[Dict[str, Any]]) -> Dict[str, int]:
    distribution = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0,
    }

    for finding in findings:
        score = int(finding.get("risk_score") or 0)

        if score >= 85:
            distribution["critical"] += 1
        elif score >= 70:
            distribution["high"] += 1
        elif score >= 40:
            distribution["medium"] += 1
        else:
            distribution["low"] += 1

    return distribution


def build_flat_entities(findings: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    entity_rows = []
    seen = set()

    for finding in findings:
        entities = finding.get("entities") or {}

        for entity_type, values in entities.items():
            if not isinstance(values, list):
                continue

            for value in values:
                key = f"{entity_type}:{value}"

                if key in seen:
                    continue

                seen.add(key)

                entity_rows.append(
                    {
                        "type": entity_type,
                        "value": value,
                        "risk_score": finding.get("risk_score", 0),
                        "source_title": finding.get("title"),
                        "source_type": finding.get("source_type"),
                    }
                )

    return entity_rows


def build_evidence_package(findings: List[Dict[str, Any]], graph: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "case_type": "CONTRABAND-KZ",
        "finding_count": len(findings),
        "high_risk_count": len([f for f in findings if int(f.get("risk_score") or 0) >= 70]),
        "evidence_urls": [
            f.get("source_url") or f.get("url")
            for f in findings
            if f.get("source_url") or f.get("url")
        ],
        "graph_node_count": len(graph.get("graph_nodes", [])),
        "graph_edge_count": len(graph.get("graph_edges", [])),
        "recommended_export": "PDF evidence package can be generated from this case object.",
    }


def build_collector_status_for_frontend(status_details: Dict[str, Dict[str, Any]]) -> Dict[str, bool]:
    return {
        key: bool(value.get("enabled")) and value.get("status") == "ok"
        for key, value in status_details.items()
    }


async def run_contraband_intelligence(input_data: Dict[str, Any] | None = None) -> Dict[str, Any]:
    input_data = input_data or {}

    started_at = datetime.utcnow().isoformat()

    mode = str(input_data.get("mode") or "demo").lower()

    include_telegram = bool(input_data.get("include_telegram", True))
    include_web = bool(input_data.get("include_web", True))
    include_darknet = bool(input_data.get("include_darknet", True))
    include_instagram = bool(input_data.get("include_instagram", True))

    sources: List[Dict[str, Any]] = []
    collector_status_details: Dict[str, Dict[str, Any]] = {}

    include_marketplace = bool(input_data.get("include_marketplace", True))

    if mode == "demo" or input_data.get("playback_mode"):
        sources = build_demo_sources()

        collector_status_details = {
            "telegram":    {"enabled": True, "status": "demo", "count": 3, "error": None},
            "web":         {"enabled": True, "status": "demo", "count": 2, "error": None},
            "darknet":     {"enabled": True, "status": "demo", "count": 1, "error": None},
            "instagram":   {"enabled": True, "status": "demo", "count": 1, "error": None},
            "marketplace": {"enabled": True, "status": "demo", "count": 1, "error": None},
        }

        collector_status = {
            "telegram": True, "web": True,
            "darknet": True, "instagram": True, "marketplace": True,
        }

    else:
        (
            (telegram_sources, collector_status_details["telegram"]),
            (web_sources,      collector_status_details["web"]),
            (darknet_sources,  collector_status_details["darknet"]),
            (instagram_sources,collector_status_details["instagram"]),
            (market_sources,   collector_status_details["marketplace"]),
        ) = await asyncio.gather(
            safe_collect("telegram",    include_telegram,    collect_telegram_sources,    input_data),
            safe_collect("web",         include_web,         collect_web_sources,         input_data),
            safe_collect("darknet",     include_darknet,     collect_darknet_sources,     input_data),
            safe_collect("instagram",   include_instagram,   collect_instagram_sources,   input_data),
            safe_collect("marketplace", include_marketplace, collect_marketplace_sources, input_data),
        )

        sources.extend(telegram_sources)
        sources.extend(web_sources)
        sources.extend(darknet_sources)
        sources.extend(instagram_sources)
        sources.extend(market_sources)

        collector_status = build_collector_status_for_frontend(collector_status_details)

    findings = classify_contraband_sources(sources)

    findings.sort(
        key=lambda item: int(item.get("risk_score") or 0),
        reverse=True,
    )

    max_findings = int(input_data.get("max_findings", 20) or 20)
    findings = findings[:max_findings]

    summary_counts = build_summary_counts(findings)
    category_counts = build_category_counts(findings)
    graph = build_contraband_graph(findings)
    timeline = build_timeline(findings)
    risk_distribution = build_risk_distribution(findings)
    entities = build_flat_entities(findings)
    evidence_package = build_evidence_package(findings, graph)

    completed_at = datetime.utcnow().isoformat()

    return {
        "module": "contraband",
        "module_id": "contraband",
        "mode": mode,
        "created_at": started_at,
        "completed_at": completed_at,
        "sources_scanned": len(sources),
        **summary_counts,
        "category_counts": category_counts,
        "findings": findings,
        "graph_nodes": graph["graph_nodes"],
        "graph_edges": graph["graph_edges"],
        "timeline": timeline,
        "entities": entities,
        "evidence_package": evidence_package,
        "risk_distribution": risk_distribution,
        "collector_status": collector_status,
        "collector_status_details": collector_status_details,
    }