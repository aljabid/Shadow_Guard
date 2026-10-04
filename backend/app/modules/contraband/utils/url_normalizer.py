from urllib.parse import urlparse


def normalize_url(value: str) -> str:
    if not value:
        return ""

    value = str(value).strip()

    if value.startswith("http://") or value.startswith("https://"):
        return value

    if value.startswith("darknet://"):
        return value

    if value.startswith("@"):
        return f"https://t.me/{value[1:]}"

    if value.startswith("t.me/"):
        return f"https://{value}"

    if ".onion" in value and not value.startswith("http"):
        return f"http://{value}"

    if "." in value:
        return f"https://{value}"

    return value


def is_http_url(value: str) -> bool:
    value = value or ""
    return value.startswith("http://") or value.startswith("https://")


def is_onion_url(value: str) -> bool:
    value = value or ""
    return ".onion" in value


def is_telegram_url(value: str) -> bool:
    value = value or ""
    return "t.me/" in value or value.startswith("@")


def get_domain(value: str) -> str:
    value = normalize_url(value)

    try:
        parsed = urlparse(value)
        return parsed.netloc or ""
    except Exception:
        return ""


def deduplicate_urls(urls: list[str]) -> list[str]:
    seen = set()
    cleaned = []

    for url in urls:
        normalized = normalize_url(url)

        if normalized and normalized not in seen:
            seen.add(normalized)
            cleaned.append(normalized)

    return cleaned