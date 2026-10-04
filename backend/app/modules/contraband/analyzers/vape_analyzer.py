from typing import Dict, List, Optional

from app.modules.contraband.entity_extractor import extract_entities
from app.modules.contraband.risk_scoring import calculate_risk_score
from app.modules.contraband.schemas import (
    ContrabandCategory,
    ContrabandFinding,
    SourceType,
)


VAPE_TERMS = [
    "elfbar",
    "elf bar",
    "hqd",
    "lost mary",
    "vozol",
    "waka",
    "вейп",
    "одноразки",
    "электронные сигареты",
    "vape",
]

WHOLESALE_TERMS = [
    "оптом",
    "wholesale",
    "партия",
    "доставка",
    "склад",
    "bulk",
]

UNLICENSED_TERMS = [
    "без документов",
    "без акциз",
    "без акциза",
    "no license",
    "серый импорт",
    "контрабанда",
]


def _contains_any(text: str, terms: List[str]) -> bool:
    text_l = (text or "").lower()
    return any(term.lower() in text_l for term in terms)


def classify_vape_category(text: str) -> Optional[ContrabandCategory]:
    has_vape = _contains_any(text, VAPE_TERMS)

    if not has_vape:
        return None

    if _contains_any(text, UNLICENSED_TERMS):
        return ContrabandCategory.vape_smuggling

    if _contains_any(text, WHOLESALE_TERMS):
        return ContrabandCategory.vape_wholesale

    return ContrabandCategory.unlicensed_vape_sale


def analyze_vape_source(source: Dict) -> Optional[Dict]:
    text = f"{source.get('title', '')} {source.get('text', '')}"
    category = classify_vape_category(text)

    if not category:
        return None

    entities = extract_entities(text)

    scoring = calculate_risk_score(
        category=category,
        source_type=source.get("source_type", SourceType.simulated.value),
        entities=entities,
        text=text,
    )

    title = source.get("title") or "Vape-related contraband intelligence finding"

    red_flags = ["Vape product keywords detected."]

    if _contains_any(text, WHOLESALE_TERMS):
        red_flags.append("Wholesale or bulk distribution language detected.")

    if _contains_any(text, UNLICENSED_TERMS):
        red_flags.append("Unlicensed/smuggling language detected.")

    if entities.get("telegram_handles"):
        red_flags.append("Telegram sales contact detected.")

    if entities.get("phones"):
        red_flags.append("Phone number detected.")

    if entities.get("locations"):
        red_flags.append("Kazakhstan location detected.")

    recommended_actions = [
        "Verify whether the seller or channel is licensed.",
        "Preserve channel, marketplace, and evidence URLs.",
        "Correlate contacts, domains, and locations with existing contraband entities.",
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
            f"{title} appears to contain vape-related contraband indicators. "
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


def analyze_vape_sources(sources: List[Dict]) -> List[Dict]:
    findings = []

    for source in sources:
        finding = analyze_vape_source(source)

        if finding:
            findings.append(finding)

    return findings