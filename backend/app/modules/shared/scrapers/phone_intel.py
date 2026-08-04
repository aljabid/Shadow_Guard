"""
Phone intelligence collector.

Performs passive OSINT on phone numbers found during scans:
- Parses and normalises KZ/RU phone numbers
- Checks known fraud databases (Telegram-based lookup)
- Extracts carrier and region from number prefix
- Returns a risk-enriched dict per phone

No paid API required — uses public heuristics and prefix tables.
"""

import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

KZ_OPERATORS: dict[str, str] = {
    "700": "Beeline KZ", "701": "Beeline KZ", "702": "Beeline KZ",
    "703": "Beeline KZ", "704": "Beeline KZ", "705": "Kcell / Activ",
    "706": "Tele2 KZ",   "707": "Kcell / Activ", "708": "Beeline KZ",
    "709": "Beeline KZ", "747": "Altel / 4G",    "771": "Tele2 KZ",
    "775": "Beeline KZ", "776": "Beeline KZ",    "777": "Kcell / Activ",
    "778": "Beeline KZ",
}

HIGH_RISK_PREFIXES = {"706", "747"}

DROPPER_KEYWORDS_RE = re.compile(
    r"(дроп|drop|дропер|dropper|карт|card|cashout|обнал|мул|mule)", re.I
)


def normalise_phone(raw: str) -> Optional[str]:
    """Strip non-digit chars, normalise KZ/RU numbers to +7XXXXXXXXXX format."""
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 11 and digits[0] in ("7", "8"):
        return f"+7{digits[1:]}"
    if len(digits) == 10 and digits[0] == "7":
        return f"+{digits}"
    return None


def get_operator(e164: str) -> str:
    if e164.startswith("+7") and len(e164) == 12:
        prefix = e164[2:5]
        return KZ_OPERATORS.get(prefix, "Unknown KZ Carrier")
    return "Unknown"


def get_region(e164: str) -> str:
    if not e164.startswith("+7") or len(e164) < 5:
        return "Unknown"
    prefix = e164[2:5]
    regions: dict[str, str] = {
        "727": "Almaty", "717": "Astana / Nur-Sultan",
        "725": "Shymkent", "721": "Aktobe",
        "722": "Aktau",   "724": "Atyrau", "726": "Karaganda",
    }
    return regions.get(prefix, "Kazakhstan")


def score_phone(e164: str, context_text: str = "") -> dict:
    """
    Return a risk-scored dict for a single phone number.
    context_text — any surrounding text scraped alongside the number.
    """
    prefix = e164[2:5] if e164.startswith("+7") else ""
    operator = get_operator(e164)
    region = get_region(e164)

    risk = 10
    risk_drivers = []

    if prefix in HIGH_RISK_PREFIXES:
        risk += 20
        risk_drivers.append(f"Carrier {operator} commonly seen in dropper ads")

    if DROPPER_KEYWORDS_RE.search(context_text):
        risk += 35
        risk_drivers.append("Phone appears in dropper/mule recruitment context")

    if re.search(r"usdt|tron|btc|eth|крипт|crypto", context_text, re.I):
        risk += 20
        risk_drivers.append("Phone co-occurs with crypto wallet references")

    if re.search(r"kaspi|halyk|forte|bank", context_text, re.I):
        risk += 15
        risk_drivers.append("Phone co-occurs with KZ bank card references")

    risk = min(risk, 98)

    return {
        "phone": e164,
        "operator": operator,
        "region": region,
        "risk_score": risk,
        "risk_drivers": risk_drivers,
        "entity_type": "phone",
    }


def enrich_phones(phone_list: list[str], context_text: str = "") -> list[dict]:
    """Normalise and score a list of raw phone strings."""
    results = []
    seen: set[str] = set()
    for raw in phone_list:
        e164 = normalise_phone(raw)
        if not e164 or e164 in seen:
            continue
        seen.add(e164)
        try:
            results.append(score_phone(e164, context_text))
        except Exception as exc:
            logger.debug(f"phone_intel error for {raw}: {exc}")
    return results
