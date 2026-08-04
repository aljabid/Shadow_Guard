'''
from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy import select

from app.models.task import ModuleTask, TaskStatus


RESULT_KEYS = {
    "tengraf": ["findings", "high_risk_findings"],
    "droper": ["top_channels"],
    "piramida": ["results"],
    "shadowbet": ["results", "operator_networks"],
    "kolkhoz": ["results"],
}


def clean(value: Any) -> str:
    return str(value or "").strip()


def normalize_entity(value: str) -> str:
    value = clean(value).lower()

    value = value.replace("https://t.me/", "")
    value = value.replace("http://t.me/", "")
    value = value.replace("t.me/", "")
    value = value.replace("@", "")

    value = value.replace("https://", "")
    value = value.replace("http://", "")
    value = value.strip("/")

    return value


def add_entity(
    registry: Dict[str, Dict[str, Any]],
    entity_type: str,
    entity_value: str,
    module_id: str,
    risk_score: int,
    source_title: str,
):
    if not entity_value:
        return

    normalized = normalize_entity(entity_value)

    if not normalized or len(normalized) < 3:
        return

    key = f"{entity_type}:{normalized}"

    if key not in registry:
        registry[key] = {
            "entity_type": entity_type,
            "entity_value": entity_value,
            "normalized_value": normalized,
            "modules": set(),
            "risk_score": 0,
            "evidence": [],
        }

    registry[key]["modules"].add(module_id)
    registry[key]["risk_score"] = max(
        int(registry[key]["risk_score"]),
        int(float(risk_score or 0)),
    )
    registry[key]["evidence"].append(
        {
            "module_id": module_id,
            "title": source_title,
            "risk_score": risk_score,
        }
    )


def values_from(item: Dict[str, Any], field: str) -> List[str]:
    values = []
    source_data = item.get("source_data") or {}
    entities = item.get("entities") or {}

    for container in [item, source_data, entities]:
        value = container.get(field)

        if isinstance(value, list):
            values.extend(value)
        elif value:
            values.append(value)

    return [clean(v) for v in values if clean(v)]


def extract_entities_from_item(item: Dict[str, Any]) -> Dict[str, List[str]]:
    output = defaultdict(list)

    for value in values_from(item, "telegram_handles"):
        output["telegram"].append(value)

    for value in values_from(item, "telegram_links"):
        output["telegram"].append(value)

    for key in ["username", "channel", "link", "source_url", "url"]:
        value = clean(item.get(key))
        if value:
            if "t.me/" in value or value.startswith("@"):
                output["telegram"].append(value)

    for value in values_from(item, "wallets") + values_from(item, "wallet_addresses"):
        output["wallet"].append(value)

    for value in values_from(item, "phones"):
        output["phone"].append(value)

    for value in values_from(item, "banks"):
        output["bank"].append(value)

    for value in values_from(item, "domains") + values_from(item, "domains_found"):
        output["domain"].append(value)

    platform_name = clean(item.get("platform_name"))
    if platform_name:
        output["platform"].append(platform_name)

    for value in values_from(item, "platforms") + values_from(item, "platforms_mentioned"):
        output["platform"].append(value)

    exchange_name = clean(item.get("exchange_name"))
    if exchange_name:
        output["exchange"].append(exchange_name)

    scheme_name = clean(item.get("scheme_name"))
    if scheme_name:
        output["scheme"].append(scheme_name)

    return {k: sorted(set(v)) for k, v in output.items()}


def get_items_from_task(task: ModuleTask) -> List[Dict[str, Any]]:
    data = task.result_data or {}
    keys = RESULT_KEYS.get(task.module_id, [])

    items = []

    for key in keys:
        value = data.get(key)
        if isinstance(value, list):
            items.extend(value)

    return items


async def build_cross_module_correlations(db, limit: int = 50) -> Dict[str, Any]:
    result = await db.execute(
        select(ModuleTask)
        .where(ModuleTask.status == TaskStatus.success)
        .order_by(ModuleTask.completed_at.desc())
        .limit(limit)
    )

    tasks = result.scalars().all()

    registry: Dict[str, Dict[str, Any]] = {}

    for task in tasks:
        for item in get_items_from_task(task):
            risk_score = int(
                float(
                    item.get("risk_score")
                    or item.get("threat_score")
                    or item.get("score")
                    or 0
                )
            )

            title = (
                item.get("title")
                or item.get("exchange_name")
                or item.get("scheme_name")
                or item.get("platform_name")
                or item.get("channel")
                or item.get("username")
                or "Untitled finding"
            )

            extracted = extract_entities_from_item(item)

            for entity_type, values in extracted.items():
                for value in values:
                    add_entity(
                        registry=registry,
                        entity_type=entity_type,
                        entity_value=value,
                        module_id=task.module_id,
                        risk_score=risk_score,
                        source_title=title,
                    )

    correlations = []

    for entity in registry.values():
        modules = sorted(entity["modules"])

        if len(modules) < 2:
            continue

        evidence = entity["evidence"]
        evidence_count = len(evidence)
        risk_score = int(entity["risk_score"])

        confidence = min(
            99,
            50 + (len(modules) * 15) + min(evidence_count, 10) * 3,
        )

        correlations.append(
            {
                "entity_type": entity["entity_type"],
                "entity_value": entity["entity_value"],
                "normalized_value": entity["normalized_value"],
                "modules": modules,
                "module_count": len(modules),
                "risk_score": risk_score,
                "confidence": confidence,
                "evidence_count": evidence_count,
                "evidence": evidence[:10],
            }
        )

    correlations.sort(
        key=lambda x: (
            x["module_count"],
            x["confidence"],
            x["risk_score"],
            x["evidence_count"],
        ),
        reverse=True,
    )

    return {
        "correlations": correlations,
        "correlation_count": len(correlations),
        "entities_indexed": len(registry),
        "tasks_indexed": len(tasks),
    }

'''



from typing import Dict, Any, List
from collections import defaultdict
from sqlalchemy import select

from app.models.task import ModuleTask, TaskStatus


RESULT_KEYS = {
    "tengraf": ["findings", "high_risk_findings"],
    "droper": ["top_channels"],
    "piramida": ["results"],
    "shadowbet": ["results", "operator_networks"],
    "kolkhoz": ["results"],
}


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def clean(value: Any) -> str:
    return str(value or "").strip()


def normalize_entity(value: str) -> str:
    value = clean(value).lower()

    value = value.replace("https://t.me/", "")
    value = value.replace("http://t.me/", "")
    value = value.replace("t.me/", "")
    value = value.replace("@", "")

    value = value.replace("https://", "")
    value = value.replace("http://", "")
    value = value.strip("/")

    return value


def display_entity(entity_type: str, value: str) -> str:
    value = clean(value)

    if entity_type == "telegram":
        normalized = normalize_entity(value)
        return f"https://t.me/{normalized}"

    return value


def unique_list(values: List[Any]) -> List[str]:
    seen = set()
    output = []

    for value in values or []:
        clean_value = clean(value)

        if not clean_value:
            continue

        key = clean_value.lower()

        if key not in seen:
            seen.add(key)
            output.append(clean_value)

    return output


def values_from(item: Dict[str, Any], field: str) -> List[str]:
    values = []
    source_data = item.get("source_data") or {}
    entities = item.get("entities") or {}

    for container in [item, source_data, entities]:
        if not isinstance(container, dict):
            continue

        value = container.get(field)

        if isinstance(value, list):
            values.extend(value)
        elif value:
            values.append(value)

    return [clean(v) for v in values if clean(v)]


def extract_entities_from_item(item: Dict[str, Any]) -> Dict[str, List[str]]:
    output = defaultdict(list)

    for value in values_from(item, "telegram_handles"):
        output["telegram"].append(value)

    for value in values_from(item, "telegram_links"):
        output["telegram"].append(value)

    for key in ["username", "channel", "link", "source_url", "url"]:
        value = clean(item.get(key))
        if value and ("t.me/" in value or value.startswith("@")):
            output["telegram"].append(value)

    for value in values_from(item, "wallets") + values_from(item, "wallet_addresses"):
        output["wallet"].append(value)

    for value in values_from(item, "phones"):
        output["phone"].append(value)

    for value in values_from(item, "banks"):
        output["bank"].append(value)

    for value in (
        values_from(item, "domains")
        + values_from(item, "domains_found")
        + values_from(item, "affiliated_domains")
    ):
        output["domain"].append(value)

    platform_name = clean(item.get("platform_name"))
    if platform_name:
        output["platform"].append(platform_name)

    for value in values_from(item, "platforms") + values_from(item, "platforms_mentioned"):
        output["platform"].append(value)

    exchange_name = clean(item.get("exchange_name"))
    if exchange_name:
        output["exchange"].append(exchange_name)

    scheme_name = clean(item.get("scheme_name"))
    if scheme_name:
        output["scheme"].append(scheme_name)

    return {k: sorted(set(v)) for k, v in output.items() if v}


def get_items_from_task(task: ModuleTask) -> List[Dict[str, Any]]:
    data = task.result_data or {}
    keys = RESULT_KEYS.get(task.module_id, [])

    items = []

    for key in keys:
        value = data.get(key)

        if isinstance(value, list):
            items.extend(value)

    return items


def get_title(item: Dict[str, Any]) -> str:
    return (
        item.get("title")
        or item.get("exchange_name")
        or item.get("scheme_name")
        or item.get("platform_name")
        or item.get("channel")
        or item.get("username")
        or item.get("operator_id")
        or "Untitled finding"
    )


def get_source_url(item: Dict[str, Any]) -> str:
    source_data = item.get("source_data") or {}

    return (
        item.get("source_url")
        or item.get("url")
        or item.get("link")
        or source_data.get("source_url")
        or ""
    )


def add_entity(
    registry: Dict[str, Dict[str, Any]],
    entity_type: str,
    entity_value: str,
    module_id: str,
    risk_score: int,
    source_title: str,
    source_url: str,
):
    if not entity_value:
        return

    normalized = normalize_entity(entity_value)

    if not normalized or len(normalized) < 3:
        return

    key = f"{entity_type}:{normalized}"

    if key not in registry:
        registry[key] = {
            "entity_type": entity_type,
            "entity_value": display_entity(entity_type, entity_value),
            "normalized_value": normalized,
            "modules": set(),
            "risk_score": 0,
            "evidence": [],
        }

    registry[key]["modules"].add(module_id)
    registry[key]["risk_score"] = max(
        safe_int(registry[key]["risk_score"]),
        safe_int(risk_score),
    )

    registry[key]["evidence"].append(
        {
            "module_id": module_id,
            "title": source_title,
            "risk_score": safe_int(risk_score),
            "source_url": source_url,
        }
    )


def get_correlation_type(entity_type: str, modules: List[str]) -> str:
    module_set = set(modules)

    if len(module_set) >= 4:
        return "MULTI_MODULE_CRIMINAL_NETWORK"

    if {"droper", "tengraf"}.issubset(module_set):
        return "DROPPER_OSINT_OVERLAP"

    if {"shadowbet", "tengraf"}.issubset(module_set):
        return "BETTING_OSINT_OVERLAP"

    if {"piramida", "tengraf"}.issubset(module_set):
        return "PYRAMID_OSINT_OVERLAP"

    if {"kolkhoz", "tengraf"}.issubset(module_set):
        return "EXCHANGE_OSINT_OVERLAP"

    if {"piramida", "shadowbet"}.issubset(module_set):
        return "FRAUD_PROMOTION_OVERLAP"

    if entity_type in ["wallet", "domain"]:
        return "SHARED_INFRASTRUCTURE"

    if entity_type == "telegram":
        return "SHARED_TELEGRAM_ACTOR"

    return "CROSS_MODULE_ENTITY_MATCH"


def get_correlation_label(value: str) -> str:
    return str(value or "").replace("_", " ").title()


def build_summary(
    entity_value: str,
    modules: List[str],
    evidence_count: int,
    risk_score: int,
) -> str:
    module_text = ", ".join(m.upper() for m in modules)

    return (
        f"{entity_value} appears across {len(modules)} modules "
        f"({module_text}) with {evidence_count} evidence item(s). "
        f"Highest linked risk is {risk_score}/100. "
        f"This suggests shared infrastructure, actor reuse, or coordinated criminal activity."
    )


def build_actions(entity_type: str, modules: List[str], risk_score: int) -> List[str]:
    actions = []

    if risk_score >= 85 or len(modules) >= 3:
        actions.append("Escalate as a coordinated cross-module investigation.")
    else:
        actions.append("Queue for analyst review and verify all evidence sources.")

    if entity_type == "telegram":
        actions.append("Capture Telegram screenshots and map related operators.")
    elif entity_type == "domain":
        actions.append("Check domain mirrors, hosting, ownership, and blocking status.")
    elif entity_type == "wallet":
        actions.append("Send wallet indicators to crypto-flow investigation.")
    elif entity_type == "platform":
        actions.append("Verify license status and linked payment infrastructure.")
    else:
        actions.append("Preserve evidence and monitor for additional overlap.")

    actions.append("Create a unified case if more matching evidence appears.")

    return actions


async def build_cross_module_correlations(db, limit: int = 50) -> Dict[str, Any]:
    result = await db.execute(
        select(ModuleTask)
        .where(ModuleTask.status == TaskStatus.success)
        .order_by(ModuleTask.completed_at.desc())
        .limit(limit)
    )

    tasks = result.scalars().all()
    registry: Dict[str, Dict[str, Any]] = {}

    for task in tasks:
        for item in get_items_from_task(task):
            if not isinstance(item, dict):
                continue

            risk_score = safe_int(
                item.get("risk_score")
                or item.get("threat_score")
                or item.get("score")
                or 0
            )

            title = get_title(item)
            source_url = get_source_url(item)
            extracted = extract_entities_from_item(item)

            for entity_type, values in extracted.items():
                for value in values:
                    add_entity(
                        registry=registry,
                        entity_type=entity_type,
                        entity_value=value,
                        module_id=task.module_id,
                        risk_score=risk_score,
                        source_title=title,
                        source_url=source_url,
                    )

    correlations = []

    for entity in registry.values():
        modules = sorted(entity["modules"])

        if len(modules) < 2:
            continue

        evidence = entity["evidence"]
        evidence_count = len(evidence)
        risk_score = safe_int(entity["risk_score"])

        confidence = min(
            99,
            45 + (len(modules) * 15) + min(evidence_count, 10) * 3,
        )

        correlation_type = get_correlation_type(entity["entity_type"], modules)

        correlations.append(
            {
                "entity_type": entity["entity_type"],
                "entity_value": entity["entity_value"],
                "normalized_value": entity["normalized_value"],
                "correlation_type": correlation_type,
                "correlation_label": get_correlation_label(correlation_type),
                "modules": modules,
                "module_count": len(modules),
                "risk_score": risk_score,
                "correlation_score": min(
                    100,
                    risk_score + (len(modules) * 8) + min(evidence_count, 10) * 2,
                ),
                "confidence": confidence,
                "evidence_count": evidence_count,
                "evidence": evidence[:12],
                "analyst_summary": build_summary(
                    entity["entity_value"],
                    modules,
                    evidence_count,
                    risk_score,
                ),
                "recommended_actions": build_actions(
                    entity["entity_type"],
                    modules,
                    risk_score,
                ),
            }
        )

    correlations.sort(
        key=lambda x: (
            x["correlation_score"],
            x["module_count"],
            x["confidence"],
            x["evidence_count"],
        ),
        reverse=True,
    )

    return {
        "correlations": correlations,
        "correlation_count": len(correlations),
        "entities_indexed": len(registry),
        "tasks_indexed": len(tasks),
    }

