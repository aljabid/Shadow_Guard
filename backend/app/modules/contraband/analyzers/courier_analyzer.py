from typing import Dict, List, Optional

from app.modules.contraband.entity_extractor import extract_entities
from app.modules.contraband.risk_scoring import calculate_risk_score
from app.modules.contraband.schemas import (
    ContrabandCategory,
    ContrabandFinding,
    SourceType,
)


COURIER_TERMS = [
    "курьер",
    "курьер нужен",
    "работа курьером",
    "кладмен",
    "кладмен нужен",
    "разнос",
    "доставка",
    "доставщик",
    "раскладка",
    "courier",
    "delivery job",
    "runner",
]

DROP_TERMS = [
    "клад",
    "закладка",
    "адрес",
    "точка",
    "район",
    "локация",
    "гео",
    "координаты",
    "stash",
    "dead drop",
    "drop point",
    "drop location",
    "coordinates",
]

RECRUITMENT_TERMS = [
    "заработок",
    "быстрые деньги",
    "ежедневная оплата",
    "оплата каждый день",
    "без опыта",
    "анонимно",
    "работа",
    "vacancy",
    "job",
    "income",
    "daily pay",
]

RISK_CONTEXT_TERMS = [
    "telegram",
    "тг",
    "оплата",
    "крипта",
    "usdt",
    "кошелек",
    "wallet",
    "наличные",
    "без документов",
]


def _contains_any(text: str, terms: List[str]) -> bool:
    text_l = (text or "").lower()
    return any(term.lower() in text_l for term in terms)


def _hit_count(text: str, terms: List[str]) -> int:
    text_l = (text or "").lower()
    return sum(1 for term in terms if term.lower() in text_l)


def classify_courier_category(text: str) -> Optional[ContrabandCategory]:
    has_courier = _contains_any(text, COURIER_TERMS)
    has_drop = _contains_any(text, DROP_TERMS)
    has_recruitment = _contains_any(text, RECRUITMENT_TERMS)

    if has_courier and has_drop:
        return ContrabandCategory.drug_drop_network

    if has_courier and has_recruitment:
        return ContrabandCategory.drug_courier_network

    if has_drop and has_recruitment:
        return ContrabandCategory.drug_drop_network

    return None


def analyze_courier_source(source: Dict) -> Optional[Dict]:
    text = f"{source.get('title', '')} {source.get('text', '')}"
    category = classify_courier_category(text)

    if not category:
        return None

    entities = extract_entities(text)

    scoring = calculate_risk_score(
        category=category,
        source_type=source.get("source_type", SourceType.simulated.value),
        entities=entities,
        text=text,
    )

    courier_hits = _hit_count(text, COURIER_TERMS)
    drop_hits = _hit_count(text, DROP_TERMS)
    recruitment_hits = _hit_count(text, RECRUITMENT_TERMS)
    context_hits = _hit_count(text, RISK_CONTEXT_TERMS)

    extra_score = min((courier_hits + drop_hits + recruitment_hits + context_hits) * 3, 18)
    final_score = min(100, int(scoring["risk_score"]) + extra_score)

    risk_level = "critical" if final_score >= 85 else "high" if final_score >= 70 else "medium" if final_score >= 40 else "low"
    evidence_priority = "critical" if final_score >= 85 else "high" if final_score >= 70 else "medium" if final_score >= 40 else "low"

    title = source.get("title") or "Courier/drop-network contraband intelligence finding"

    red_flags = [
        "Courier or drop-network language detected.",
    ]

    if drop_hits:
        red_flags.append("Drop/stash location wording detected.")

    if recruitment_hits:
        red_flags.append("Recruitment language detected.")

    if entities.get("telegram_handles"):
        red_flags.append("Telegram contact/channel detected.")

    if entities.get("phones"):
        red_flags.append("Phone number detected.")

    if entities.get("wallets"):
        red_flags.append("Crypto wallet/payment indicator detected.")

    if entities.get("locations"):
        red_flags.append("Kazakhstan location detected.")

    recommended_actions = [
        "Escalate if courier/drop evidence is confirmed.",
        "Preserve source URL, Telegram contacts, and message evidence.",
        "Extract phone numbers, wallets, locations, and courier aliases.",
        "Correlate with DROPER and TENGRAF entities.",
    ]

    finding = ContrabandFinding(
        title=title,
        crime_category=category,
        risk_score=final_score,
        risk_level=risk_level,
        evidence_priority=evidence_priority,
        source_type=source.get("source_type", SourceType.simulated.value),
        source_name=source.get("source_name"),
        source_url=source.get("source_url"),
        city=entities.get("locations", [None])[0] if entities.get("locations") else None,
        entities=entities,
        analyst_summary=(
            f"{title} appears to contain courier or drop-network indicators. "
            f"The finding is classified as {category.value.replace('_', ' ').title()} "
            f"with a risk score of {final_score}/100."
        ),
        red_flags=red_flags,
        recommended_actions=recommended_actions,
        evidence_urls=[source.get("source_url")] if source.get("source_url") else [],
        alert_fired=final_score >= 40,
        confidence="High" if final_score >= 70 else "Medium",
        raw_text_excerpt=(source.get("text") or "")[:500],
        source_data=source,
    )

    return finding.model_dump()


def analyze_courier_sources(sources: List[Dict]) -> List[Dict]:
    findings = []

    for source in sources:
        finding = analyze_courier_source(source)

        if finding:
            findings.append(finding)

    return findings