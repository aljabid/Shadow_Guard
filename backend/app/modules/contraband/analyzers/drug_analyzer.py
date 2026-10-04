from typing import Dict, List, Optional

from app.modules.contraband.entity_extractor import extract_entities
from app.modules.contraband.risk_scoring import calculate_risk_score
from app.modules.contraband.schemas import (
    ContrabandCategory,
    ContrabandFinding,
    SourceType,
)


DRUG_VENDOR_TERMS = [
    "закладка",
    "клад",
    "кладмен",
    "наркотик",
    "меф",
    "мефедрон",
    "соль",
    "alpha-pvp",
    "a-pvp",
    "weed",
    "cocaine",
    "hash",
    "героин",
    "марихуана",
]

DROP_NETWORK_TERMS = [
    "клад",
    "адрес",
    "район",
    "точка",
    "stash",
    "dead drop",
    "drop location",
]

COURIER_TERMS = [
    "курьер",
    "кладмен нужен",
    "работа курьером",
    "доставка",
    "разнос",
    "courier",
]


def _contains_any(text: str, terms: List[str]) -> bool:
    text_l = (text or "").lower()
    return any(term.lower() in text_l for term in terms)


def classify_drug_category(text: str) -> Optional[ContrabandCategory]:
    has_vendor = _contains_any(text, DRUG_VENDOR_TERMS)
    has_drop = _contains_any(text, DROP_NETWORK_TERMS)
    has_courier = _contains_any(text, COURIER_TERMS)

    if has_vendor and has_courier:
        return ContrabandCategory.drug_courier_network

    if has_vendor and has_drop:
        return ContrabandCategory.drug_drop_network

    if has_vendor:
        return ContrabandCategory.drug_vendor

    return None


def analyze_drug_source(source: Dict) -> Optional[Dict]:
    text = f"{source.get('title', '')} {source.get('text', '')}"
    category = classify_drug_category(text)

    if not category:
        return None

    entities = extract_entities(text)

    scoring = calculate_risk_score(
        category=category,
        source_type=source.get("source_type", SourceType.simulated.value),
        entities=entities,
        text=text,
    )

    title = source.get("title") or "Drug-related contraband intelligence finding"

    red_flags = [
        "Drug-related terminology detected.",
    ]

    if entities.get("telegram_handles"):
        red_flags.append("Telegram contact/channel detected.")

    if entities.get("phones"):
        red_flags.append("Phone number detected.")

    if entities.get("wallets"):
        red_flags.append("Crypto wallet detected.")

    if entities.get("locations"):
        red_flags.append("Kazakhstan location detected.")

    recommended_actions = [
        "Escalate for analyst review if evidence is confirmed.",
        "Preserve Telegram/source URL and message evidence.",
        "Correlate phone numbers, wallets, and locations with existing entities.",
    ]

    finding = ContrabandFinding(
        title=title,
        crime_category=category,
        risk_score=scoring["risk_score"],
        risk_level=scoring["risk_level"],
        evidence_priority=scoring["evidence_priority"],
        source_type=source.get("source_type", SourceType.simulated.value),
        source_name=source.get("source_name"),
        source_url=source.get("source_url"),
        city=entities.get("locations", [None])[0] if entities.get("locations") else None,
        entities=entities,
        analyst_summary=(
            f"{title} appears to contain drug-related contraband indicators. "
            f"The finding is classified as {category.value.replace('_', ' ').title()} "
            f"with a risk score of {scoring['risk_score']}/100."
        ),
        red_flags=red_flags,
        recommended_actions=recommended_actions,
        evidence_urls=[source.get("source_url")] if source.get("source_url") else [],
        alert_fired=scoring["alert_fired"],
        confidence="High" if scoring["risk_score"] >= 70 else "Medium",
        raw_text_excerpt=(source.get("text") or "")[:500],
        source_data=source,
    )

    return finding.model_dump()


def analyze_drug_sources(sources: List[Dict]) -> List[Dict]:
    findings = []

    for source in sources:
        finding = analyze_drug_source(source)

        if finding:
            findings.append(finding)

    return findings