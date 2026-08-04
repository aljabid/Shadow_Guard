from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy import select

from app.models.task import ModuleTask, TaskStatus


GRAPH_RESULT_KEYS = {
    "tengraf": "findings",
    "droper": "top_channels",
    "piramida": "results",
    "shadowbet": "results",
    "kolkhoz": "results",
}


def clean_value(value: Any) -> str:
    return str(value or "").strip()


def make_id(prefix: str, value: str) -> str:
    safe = (
        value.lower()
        .replace("https://", "")
        .replace("http://", "")
        .replace("/", "_")
        .replace("@", "at_")
        .replace(" ", "_")
        .replace(".", "_")
        .replace(":", "_")
    )
    return f"{prefix}_{safe[:80]}"


def add_node(nodes: Dict[str, Dict[str, Any]], node_id: str, label: str, node_type: str, risk_score: int = 0):
    if not label:
        return

    if node_id not in nodes:
        nodes[node_id] = {
            "id": node_id,
            "label": label,
            "type": node_type,
            "risk_score": risk_score,
        }
    else:
        nodes[node_id]["risk_score"] = max(
            int(nodes[node_id].get("risk_score") or 0),
            int(risk_score or 0),
        )


def add_edge(edges: Dict[str, Dict[str, Any]], source: str, target: str, label: str):
    if not source or not target or source == target:
        return

    edge_id = f"{source}->{target}:{label}"

    if edge_id not in edges:
        edges[edge_id] = {
            "id": edge_id,
            "source": source,
            "target": target,
            "label": label,
        }


def extract_values(item: Dict[str, Any], field: str) -> List[str]:
    values = []

    source_data = item.get("source_data") or {}
    entities = item.get("entities") or {}

    for container in [item, source_data, entities]:
        value = container.get(field)

        if isinstance(value, list):
            values.extend(value)
        elif value:
            values.append(value)

    return sorted(set(clean_value(v) for v in values if clean_value(v)))


def extract_telegram_links(item: Dict[str, Any]) -> List[str]:
    values = []

    for key in ["telegram_links", "telegram_handles"]:
        values.extend(extract_values(item, key))

    for key in ["source_url", "url", "link", "channel", "username"]:
        value = clean_value(item.get(key))
        if value:
            if "t.me/" in value:
                values.append(value)
            elif value.startswith("@"):
                values.append(f"https://t.me/{value[1:]}")
            elif key in ["channel", "username"] and " " not in value:
                values.append(f"https://t.me/{value}")

    return sorted(set(values))


def build_graph_from_items(module_id: str, items: List[Dict[str, Any]], nodes: Dict[str, Any], edges: Dict[str, Any]):
    module_node_id = make_id("module", module_id)
    add_node(nodes, module_node_id, module_id.upper(), "module", 0)

    for idx, item in enumerate(items):
        risk_score = int(float(item.get("risk_score") or item.get("threat_score") or 0))

        title = (
            item.get("title")
            or item.get("exchange_name")
            or item.get("scheme_name")
            or item.get("platform_name")
            or item.get("channel")
            or item.get("username")
            or f"{module_id} finding {idx + 1}"
        )

        finding_id = make_id("finding", f"{module_id}_{title}_{idx}")
        add_node(nodes, finding_id, title, "finding", risk_score)
        add_edge(edges, module_node_id, finding_id, "produced")

        source_url = clean_value(
            item.get("source_url")
            or item.get("url")
            or (item.get("source_data") or {}).get("source_url")
        )

        if source_url:
            source_id = make_id("source", source_url)
            add_node(nodes, source_id, source_url, "source", risk_score)
            add_edge(edges, finding_id, source_id, "evidence")

        for bank in extract_values(item, "banks"):
            bank_id = make_id("bank", bank)
            add_node(nodes, bank_id, bank, "bank", risk_score)
            add_edge(edges, finding_id, bank_id, "mentions")

        for wallet in extract_values(item, "wallets") + extract_values(item, "wallet_addresses"):
            wallet_id = make_id("wallet", wallet)
            add_node(nodes, wallet_id, wallet, "wallet", risk_score)
            add_edge(edges, finding_id, wallet_id, "linked wallet")

        for phone in extract_values(item, "phones"):
            phone_id = make_id("phone", phone)
            add_node(nodes, phone_id, phone, "phone", risk_score)
            add_edge(edges, finding_id, phone_id, "linked phone")

        for domain in extract_values(item, "domains") + extract_values(item, "domains_found"):
            domain_id = make_id("domain", domain)
            add_node(nodes, domain_id, domain, "domain", risk_score)
            add_edge(edges, finding_id, domain_id, "linked domain")

        for platform in extract_values(item, "platforms") + [clean_value(item.get("platform_name"))]:
            if not platform:
                continue
            platform_id = make_id("platform", platform)
            add_node(nodes, platform_id, platform, "platform", risk_score)
            add_edge(edges, finding_id, platform_id, "mentions platform")

        for tg in extract_telegram_links(item):
            tg_id = make_id("telegram", tg)
            add_node(nodes, tg_id, tg, "telegram", risk_score)
            add_edge(edges, finding_id, tg_id, "telegram source")


async def build_unified_intelligence_graph(db, limit: int = 30) -> Dict[str, Any]:
    result = await db.execute(
        select(ModuleTask)
        .where(TaskStatus.success == ModuleTask.status)
        .order_by(ModuleTask.completed_at.desc())
        .limit(limit)
    )

    tasks = result.scalars().all()

    nodes: Dict[str, Dict[str, Any]] = {}
    edges: Dict[str, Dict[str, Any]] = {}

    for task in tasks:
        data = task.result_data or {}
        key = GRAPH_RESULT_KEYS.get(task.module_id)

        if not key:
            continue

        items = data.get(key) or []

        if isinstance(items, list):
            build_graph_from_items(task.module_id, items, nodes, edges)

    return {
        "nodes": list(nodes.values()),
        "edges": list(edges.values()),
        "node_count": len(nodes),
        "edge_count": len(edges),
        "task_count": len(tasks),
    }