import re
from typing import Optional


def validate_iin(iin: str) -> bool:
    if not re.match(r"^\d{12}$", iin):
        return False
    try:
        month = int(iin[2:4])
        day = int(iin[4:6])
        return 1 <= month <= 12 and 1 <= day <= 31
    except ValueError:
        return False


def validate_kz_phone(phone: str) -> bool:
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    return bool(re.match(r"^(\+7|8|7)\d{10}$", cleaned))


def validate_telegram_username(username: str) -> bool:
    username = username.lstrip("@")
    return bool(re.match(r"^[a-zA-Z][a-zA-Z0-9_]{4,31}$", username))


def validate_domain(domain: str) -> bool:
    pattern = r"^(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
    return bool(re.match(pattern, domain))


def sanitize_input(value: str, max_length: int = 500) -> str:
    value = value.strip()
    value = re.sub(r"[<>\"'%;()&+]", "", value)
    return value[:max_length]


def validate_module_id(module_id: str) -> bool:
    return module_id in {"kolkhoz", "droper", "piramida", "shadowbet"}
