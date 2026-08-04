import re
from typing import Optional


def get_phone_region(phone: str) -> Optional[str]:
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    if cleaned.startswith("+7") or cleaned.startswith("8"):
        digits = cleaned.lstrip("+78")
        if digits.startswith("70") or digits.startswith("71"):
            return "Kazakhstan"
        if digits.startswith("9"):
            return "Russia"
    return "Unknown"


def normalize_phone(phone: str) -> str:
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    if cleaned.startswith("8") and len(cleaned) == 11:
        cleaned = "+7" + cleaned[1:]
    elif cleaned.startswith("7") and len(cleaned) == 11:
        cleaned = "+" + cleaned
    return cleaned


def enrich_phones(phones: list) -> list:
    return [{"original": p, "normalized": normalize_phone(p), "region": get_phone_region(p)} for p in phones]
