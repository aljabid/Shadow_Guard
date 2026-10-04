from typing import Dict, List, Optional

from app.modules.contraband.entity_extractor import extract_entities
from app.modules.contraband.risk_scoring import calculate_risk_score
from app.modules.contraband.schemas import (
    ContrabandCategory,
    ContrabandFinding,
    SourceType,
)


ALCOHOL_TERMS = [
    "алкоголь",
    "водка",
    "коньяк",
    "виски",
    "ром",
    "текила",
    "шампанское",
    "спирт",
    "alcohol",
    "vodka",
    "whiskey",
    "whisky",
    "cognac",
    "rum",
    "tequila",
]

WHOLESALE_TERMS = [
    "оптом",
    "wholesale",
    "партия",
    "ящик",
    "коробка",
    "bulk",
    "доставка",
    "склад",
]

SMUGGLING_TERMS = [
    "без акциз",
    "без акциза",
    "без документов",
    "контрабанда",
    "серый импорт",
    "no excise",
    "no license",
    "without documents",
]

COUNTERFEIT_TERMS = [
    "контрафакт",
    "подделка",
    "реплика",
    "fake alcohol",
    "counterfeit",
    "non-original",
]


def _contains_any(text: str, terms: List[str]) -> bool:
    text_l = (text or "").lower()
    return any(term.lower() in text_l for term in terms)


def classify_alcohol_category(text: str) -> Optional[ContrabandCategory]:
    has_alcohol = _contains_any(text, ALCOHOL_TERMS)

    if not has_alcohol:
        return None

    if _contains_any(text, COUNTERFEIT_TERMS):
        return ContrabandCategory.counterfeit_alcohol

    if _contains_any(text, SMUGGLING_TERMS):
        return ContrabandCategory.alcohol_smuggling

    if _contains_any(text, WHOLESALE_TERMS):
        return ContrabandCategory.unlicensed_alcohol_sale

    return ContrabandCategory.unlicensed_alcohol_sale


def analyze_alcohol_source(source: Dict) -> Optional[Dict]:
    text = f"{source.get('title', '')} {source.get('text', '')}"
    category = classify_alcohol_category(text)

    if not category:
        return None

    entities = extract_entities(text)

    scoring = calculate_risk_score(
        category=category,
        source_type=source.get("source_type", SourceType.simulated.value),
        entities=entities,
        text=text,
    )

    title = source.get("title") or "Alcohol-related contraband intelligence finding"

    red_flags = ["Alcohol sale/distribution keywords detected."]

    if _contains_any(text, WHOLESALE_TERMS):
        red_flags.append("Wholesale or bulk distribution language detected.")

    if _contains_any(text, SMUGGLING_TERMS):
        red_flags.append("Smuggling or no-excise language detected.")

    if _contains_any(text, COUNTERFEIT_TERMS):
        red_flags.append("Counterfeit alcohol indicators detected.")

    if entities.get("telegram_handles"):
        red_flags.append("Telegram sales contact detected.")

    if entities.get("phones"):
        red_flags.append("Phone number detected.")

    if entities.get("locations"):
        red_flags.append("Kazakhstan location detected.")

    recommended_actions = [
        "Verify seller/channel licensing and excise documentation.",
        "Preserve source URL, contact details, and marketplace evidence.",
        "Correlate phones, Telegram handles, domains, and locations with existing entities.",
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
            f"{title} appears to contain illegal alcohol distribution indicators. "
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


def analyze_alcohol_sources(sources: List[Dict]) -> List[Dict]:
    findings = []

    for source in sources:
        finding = analyze_alcohol_source(source)

        if finding:
            findings.append(finding)

    return findings