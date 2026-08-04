import re
from app.modules.tengraf.config import BANK_KEYWORDS, PLATFORM_KEYWORDS

DOMAIN_RE = re.compile(r"\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b")
PHONE_RE = re.compile(r"(?:\+7|8)\s?\(?\d{3}\)?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}")
TG_HANDLE_RE = re.compile(r"@([a-zA-Z0-9_]{5,32})")
TRON_RE = re.compile(r"\bT[A-Za-z1-9]{33}\b")


def unique(items):
    seen = set()
    out = []

    for item in items:
        if not item:
            continue

        clean = str(item).strip()
        key = clean.lower()

        if key not in seen:
            seen.add(key)
            out.append(clean)

    return out


def extract_entities(text: str) -> dict:
    text = text or ""
    lower = text.lower()

    return {
        "domains": unique(DOMAIN_RE.findall(text)),
        "phones": unique(PHONE_RE.findall(text)),
        "telegram_handles": unique([f"@{h}" for h in TG_HANDLE_RE.findall(text)]),
        "wallets": unique(TRON_RE.findall(text)),
        "banks": unique([b for b in BANK_KEYWORDS if b in lower]),
        "platforms": unique([p for p in PLATFORM_KEYWORDS if p.lower() in lower]),
    }