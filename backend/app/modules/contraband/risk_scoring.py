from typing import Dict, List, Tuple

from app.modules.contraband.schemas import (
    ContrabandCategory,
    EvidencePriority,
    RiskLevel,
    SourceType,
)


HIGH_RISK_CATEGORIES = {
    ContrabandCategory.drug_vendor,
    ContrabandCategory.drug_drop_network,
    ContrabandCategory.drug_courier_network,
    ContrabandCategory.contraband_marketplace,
}

MEDIUM_RISK_CATEGORIES = {
    ContrabandCategory.vape_smuggling,
    ContrabandCategory.vape_wholesale,
    ContrabandCategory.unlicensed_vape_sale,
    ContrabandCategory.alcohol_smuggling,
    ContrabandCategory.counterfeit_alcohol,
    ContrabandCategory.unlicensed_alcohol_sale,
}


def clamp_score(score: int) -> int:
    return max(0, min(100, int(score)))


def get_risk_level(score: int) -> RiskLevel:
    score = clamp_score(score)

    if score >= 85:
        return RiskLevel.critical

    if score >= 70:
        return RiskLevel.high

    if score >= 40:
        return RiskLevel.medium

    return RiskLevel.low


def get_evidence_priority(score: int) -> EvidencePriority:
    score = clamp_score(score)

    if score >= 85:
        return EvidencePriority.critical

    if score >= 70:
        return EvidencePriority.high

    if score >= 40:
        return EvidencePriority.medium

    return EvidencePriority.low


def score_source_type(source_type: SourceType | str) -> int:
    value = str(source_type)

    if value == SourceType.darknet.value:
        return 25

    if value == SourceType.telegram.value:
        return 15

    if value == SourceType.marketplace.value:
        return 18

    if value == SourceType.forum.value:
        return 12

    if value == SourceType.instagram.value:
        return 8

    if value == SourceType.public_web.value:
        return 6

    return 5


def score_category(category: ContrabandCategory | str) -> int:
    try:
        normalized = ContrabandCategory(category)
    except Exception:
        normalized = ContrabandCategory.osint_finding

    if normalized in HIGH_RISK_CATEGORIES:
        return 35

    if normalized in MEDIUM_RISK_CATEGORIES:
        return 22

    return 10


def score_entities(entities: Dict) -> Tuple[int, List[str]]:
    score = 0
    drivers: List[str] = []

    telegram_handles = entities.get("telegram_handles") or []
    phones = entities.get("phones") or []
    wallets = entities.get("wallets") or []
    domains = entities.get("domains") or []
    locations = entities.get("locations") or []
    substances = entities.get("substances") or []
    brands = entities.get("brands") or []
    prices = entities.get("prices") or []

    if telegram_handles:
        score += 10
        drivers.append("Telegram contact/channel detected.")

    if phones:
        score += 12
        drivers.append("Phone number detected.")

    if wallets:
        score += 15
        drivers.append("Crypto wallet detected.")

    if domains:
        score += 7
        drivers.append("Linked domain or marketplace URL detected.")

    if locations:
        score += 10
        drivers.append("Kazakhstan location/city detected.")

    if substances:
        score += 18
        drivers.append("Drug/substance indicators detected.")

    if brands:
        score += 8
        drivers.append("Vape/alcohol brand indicators detected.")

    if prices:
        score += 6
        drivers.append("Price or sales indicator detected.")

    return score, drivers


def score_text_signals(text: str) -> Tuple[int, List[str]]:
    text_l = (text or "").lower()
    score = 0
    drivers: List[str] = []

    drug_terms = [
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

    courier_terms = [
        "курьер",
        "работа курьером",
        "доставка",
        "кладмен нужен",
        "разнос",
        "drop location",
        "stash",
        "dead drop",
    ]

    vape_terms = [
        "elf bar",
        "elfbar",
        "hqd",
        "lost mary",
        "вейп",
        "электронные сигареты",
        "одноразки",
        "vape wholesale",
    ]

    alcohol_terms = [
        "алкоголь оптом",
        "водка оптом",
        "коньяк оптом",
        "без акциз",
        "без акциза",
        "контрафакт алкоголь",
        "counterfeit alcohol",
    ]

    if any(term in text_l for term in drug_terms):
        score += 25
        drivers.append("Drug marketplace/vendor keywords detected.")

    if any(term in text_l for term in courier_terms):
        score += 18
        drivers.append("Courier or drop-network language detected.")

    if any(term in text_l for term in vape_terms):
        score += 16
        drivers.append("Vape smuggling or unlicensed vape sales keywords detected.")

    if any(term in text_l for term in alcohol_terms):
        score += 16
        drivers.append("Illegal alcohol or counterfeit alcohol keywords detected.")

    if "оптом" in text_l or "wholesale" in text_l:
        score += 6
        drivers.append("Wholesale distribution indicator detected.")

    if "доставка" in text_l or "delivery" in text_l:
        score += 6
        drivers.append("Delivery/distribution indicator detected.")

    if "казахстан" in text_l or "алматы" in text_l or "астана" in text_l:
        score += 6
        drivers.append("Kazakhstan targeting indicator detected.")

    return score, drivers


def calculate_risk_score(
    category: ContrabandCategory | str,
    source_type: SourceType | str,
    entities: Dict,
    text: str = "",
) -> Dict:
    base_score = 5

    category_score = score_category(category)
    source_score = score_source_type(source_type)
    entity_score, entity_drivers = score_entities(entities)
    text_score, text_drivers = score_text_signals(text)

    final_score = clamp_score(
        base_score + category_score + source_score + entity_score + text_score
    )

    drivers = [
        f"Category signal: {str(category)}.",
        f"Source signal: {str(source_type)}.",
        *entity_drivers,
        *text_drivers,
    ]

    return {
        "risk_score": final_score,
        "risk_level": get_risk_level(final_score).value,
        "evidence_priority": get_evidence_priority(final_score).value,
        "alert_fired": final_score >= 40,
        "risk_drivers": drivers[:8],
    }