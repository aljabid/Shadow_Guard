from typing import Dict, List, Any
from collections import defaultdict


ENTITY_FIELDS = [
    "telegram_handles",
    "telegram_links",
    "domains",
    "wallets",
    "wallet_addresses",
    "phones",
    "banks",
    "platforms",
    "platforms_mentioned",
    "domains_found",
    "affiliated_domains",
]


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def clean_value(value: Any) -> str:
    return str(value or "").strip()


def normalize_entity(value: str) -> str:
    value = clean_value(value).lower()

    value = value.replace("https://t.me/", "@")
    value = value.replace("http://t.me/", "@")
    value = value.replace("t.me/", "@")

    value = value.replace("https://", "")
    value = value.replace("http://", "")
    value = value.strip("/")

    if value.startswith("@@"):
        value = value[1:]

    if value and not value.startswith("@") and "/" not in value and " " not in value:
        if (
            value.endswith("_kz")
            or "drop" in value
            or "invest" in value
            or "bet" in value
            or "kz" in value
        ):
            value = f"@{value}"

    return value


def normalize_entity_type(field: str) -> str:
    mapping = {
        "telegram_handles": "telegram",
        "telegram_links": "telegram",
        "wallets": "wallet",
        "wallet_addresses": "wallet",
        "domains": "domain",
        "domains_found": "domain",
        "affiliated_domains": "domain",
        "phones": "phone",
        "banks": "bank",
        "platforms": "platform",
        "platforms_mentioned": "platform",
    }

    return mapping.get(field, field)


def unique_list(values: List[Any]) -> List[str]:
    seen = set()
    output = []

    for value in values or []:
        clean = clean_value(value)

        if not clean:
            continue

        key = clean.lower()

        if key not in seen:
            seen.add(key)
            output.append(clean)

    return output


def values_from_container(container: Dict[str, Any], field: str) -> List[Any]:
    if not isinstance(container, dict):
        return []

    value = container.get(field)

    if isinstance(value, list):
        return value

    if value:
        return [value]

    return []


def extract_entities_from_item(item: Dict[str, Any]) -> Dict[str, List[str]]:
    entities = defaultdict(list)

    item_entities = item.get("entities") or {}
    source_data = item.get("source_data") or {}

    containers = [item, source_data, item_entities]

    for field in ENTITY_FIELDS:
        entity_type = normalize_entity_type(field)
        values = []

        for container in containers:
            values.extend(values_from_container(container, field))

        for value in values:
            normalized = normalize_entity(value)

            if normalized:
                entities[entity_type].append(normalized)

    platform_name = item.get("platform_name")

    if platform_name:
        entities["platform"].append(normalize_entity(platform_name))

    exchange_name = item.get("exchange_name")

    if exchange_name:
        entities["exchange"].append(normalize_entity(exchange_name))

    scheme_name = item.get("scheme_name")

    if scheme_name:
        entities["scheme"].append(normalize_entity(scheme_name))

    username = item.get("username") or item.get("channel")

    if username:
        entities["telegram"].append(normalize_entity(username))

    source_url = item.get("source_url") or source_data.get("source_url")

    if source_url:
        if "t.me/" in source_url or source_url.startswith("@"):
            entities["telegram"].append(normalize_entity(source_url))
        elif "." in source_url:
            entities["domain"].append(normalize_entity(source_url))

    domain = item.get("domain") or item.get("platform_domain")

    if domain:
        entities["domain"].append(normalize_entity(domain))

    return {
        key: sorted(set(value))
        for key, value in entities.items()
        if value
    }


def get_finding_title(item: Dict[str, Any]) -> str:
    return (
        item.get("title")
        or item.get("scheme_name")
        or item.get("platform_name")
        or item.get("exchange_name")
        or item.get("channel")
        or item.get("username")
        or "Untitled finding"
    )


def get_risk_score(item: Dict[str, Any]) -> int:
    return safe_int(
        item.get("risk_score")
        or item.get("threat_score")
        or item.get("score")
        or item.get("final_score")
        or 0
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


def get_evidence_urls(item: Dict[str, Any]) -> List[str]:
    source_data = item.get("source_data") or {}

    urls = []

    for field in [
        "source_url",
        "url",
        "link",
        "website",
        "exchange_url",
        "telegram",
        "support_channel",
    ]:
        if item.get(field):
            urls.append(item.get(field))

    for field in [
        "evidence_urls",
        "telegram_links",
        "web_links",
        "github_links",
        "reddit_links",
        "onion_links",
    ]:
        value = item.get(field)

        if isinstance(value, list):
            urls.extend(value)

        source_value = source_data.get(field)

        if isinstance(source_value, list):
            urls.extend(source_value)

    if source_data.get("source_url"):
        urls.append(source_data.get("source_url"))

    return unique_list(urls)


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


def get_correlation_label(correlation_type: str) -> str:
    return correlation_type.replace("_", " ").title()


def get_confidence(module_count: int, evidence_count: int, max_risk: int) -> int:
    confidence = 45
    confidence += module_count * 15
    confidence += min(evidence_count, 10) * 3

    if max_risk >= 85:
        confidence += 10
    elif max_risk >= 70:
        confidence += 6
    elif max_risk >= 40:
        confidence += 3

    return min(99, confidence)


def get_correlation_score(module_count: int, evidence_count: int, max_risk: int) -> int:
    score = max_risk
    score += module_count * 8
    score += min(evidence_count, 10) * 2

    return min(100, score)


def build_analyst_summary(
    entity_value: str,
    entity_type: str,
    modules: List[str],
    evidence_count: int,
    max_risk: int,
) -> str:
    module_text = ", ".join(m.upper() for m in modules)

    return (
        f"{entity_value} appears across {len(modules)} ShadowGuard modules "
        f"({module_text}) with {evidence_count} evidence item(s). "
        f"The highest linked risk score is {max_risk}/100. "
        f"This suggests the entity may be part of a shared criminal infrastructure, "
        f"promotion network, or reusable fraud indicator requiring coordinated review."
    )


def build_recommended_actions(entity_type: str, modules: List[str], max_risk: int) -> List[str]:
    actions = []

    if max_risk >= 85 or len(modules) >= 3:
        actions.append("Escalate as a coordinated cross-module investigation.")
    else:
        actions.append("Queue for analyst review and cross-check with source evidence.")

    if entity_type == "telegram":
        actions.append("Capture Telegram channel evidence and map related operators.")
    elif entity_type == "domain":
        actions.append("Check domain ownership, mirrors, hosting, and blocking status.")
    elif entity_type == "wallet":
        actions.append("Send wallet indicators to crypto-flow investigation.")
    elif entity_type == "platform":
        actions.append("Verify license status and linked payment infrastructure.")
    else:
        actions.append("Preserve evidence and monitor for additional module overlap.")

    actions.append("Create a unified case if new matching evidence appears.")

    return actions


def correlate_module_results(
    module_results: Dict[str, List[Dict[str, Any]]]
) -> List[Dict[str, Any]]:
    index = defaultdict(list)

    for module_id, items in module_results.items():
        for item in items or []:
            if not isinstance(item, dict):
                continue

            extracted = extract_entities_from_item(item)
            title = get_finding_title(item)
            risk_score = get_risk_score(item)
            source_url = get_source_url(item)
            evidence_urls = get_evidence_urls(item)

            for entity_type, values in extracted.items():
                for value in values:
                    index[f"{entity_type}:{value}"].append(
                        {
                            "module_id": module_id,
                            "entity_type": entity_type,
                            "entity_value": value,
                            "title": title,
                            "risk_score": risk_score,
                            "source_url": source_url,
                            "evidence_urls": evidence_urls,
                        }
                    )

    correlations = []

    for key, appearances in index.items():
        modules = sorted(set(a["module_id"] for a in appearances))

        if len(modules) < 2:
            continue

        entity_type = appearances[0]["entity_type"]
        entity_value = appearances[0]["entity_value"]
        max_risk = max(safe_int(a.get("risk_score"), 0) for a in appearances)
        evidence_count = len(appearances)

        correlation_type = get_correlation_type(entity_type, modules)
        confidence = get_confidence(len(modules), evidence_count, max_risk)
        correlation_score = get_correlation_score(
            len(modules),
            evidence_count,
            max_risk,
        )

        correlations.append(
            {
                "entity_type": entity_type,
                "entity_value": entity_value,
                "normalized_value": entity_value,
                "correlation_type": correlation_type,
                "correlation_label": get_correlation_label(correlation_type),
                "modules": modules,
                "module_count": len(modules),
                "appearances": appearances[:15],
                "evidence_count": evidence_count,
                "max_risk_score": max_risk,
                "risk_score": max_risk,
                "confidence": confidence,
                "correlation_score": correlation_score,
                "analyst_summary": build_analyst_summary(
                    entity_value=entity_value,
                    entity_type=entity_type,
                    modules=modules,
                    evidence_count=evidence_count,
                    max_risk=max_risk,
                ),
                "recommended_actions": build_recommended_actions(
                    entity_type=entity_type,
                    modules=modules,
                    max_risk=max_risk,
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

    return correlations