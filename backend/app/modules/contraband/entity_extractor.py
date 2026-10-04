import re
from typing import Dict, List

KAZAKHSTAN_CITIES = [
    "almaty",
    "astana",
    "shymkent",
    "aktobe",
    "atyrau",
    "taraz",
    "karaganda",
    "kostanay",
    "pavlodar",
    "ust-kamenogorsk",
    "semey",
]

DRUG_KEYWORDS = [
    "mephedrone",
    "mef",
    "alpha-pvp",
    "a-pvp",
    "weed",
    "hash",
    "cocaine",
    "heroin",
    "meth",
    "amphetamine",
    "марихуана",
    "меф",
    "соль",
    "героин",
]

VAPE_BRANDS = [
    "elfbar",
    "elf bar",
    "hqd",
    "lost mary",
    "vozol",
    "waka",
]

ALCOHOL_BRANDS = [
    "absolut",
    "jack daniels",
    "jameson",
    "hennessy",
    "chivas",
]

PHONE_REGEX = re.compile(
    r"(?:\+7|8)?[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}"
)

URL_REGEX = re.compile(
    r"https?://[^\s]+"
)

DOMAIN_REGEX = re.compile(
    r"\b(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}\b"
)

TELEGRAM_REGEX = re.compile(
    r"(?:@[\w\d_]{4,}|t\.me/[\w\d_]+)"
)

PRICE_REGEX = re.compile(
    r"\b\d+(?:[\.,]\d+)?\s?(?:₸|kzt|тенге|tg)\b",
    re.IGNORECASE,
)

TRON_REGEX = re.compile(
    r"\bT[a-zA-Z0-9]{33}\b"
)

BTC_REGEX = re.compile(
    r"\b(?:bc1|[13])[a-zA-HJ-NP-Z0-9]{25,42}\b"
)


def unique(values: List[str]) -> List[str]:
    return list(dict.fromkeys(v.strip() for v in values if v))


def extract_telegram(text: str) -> List[str]:
    return unique(TELEGRAM_REGEX.findall(text))


def extract_phones(text: str) -> List[str]:
    return unique(PHONE_REGEX.findall(text))


def extract_urls(text: str) -> List[str]:
    return unique(URL_REGEX.findall(text))


def extract_domains(text: str) -> List[str]:
    return unique(DOMAIN_REGEX.findall(text))


def extract_wallets(text: str) -> List[str]:
    wallets = []
    wallets.extend(TRON_REGEX.findall(text))
    wallets.extend(BTC_REGEX.findall(text))
    return unique(wallets)


def extract_locations(text: str) -> List[str]:
    lower = text.lower()

    return [
        city
        for city in KAZAKHSTAN_CITIES
        if city in lower
    ]


def extract_substances(text: str) -> List[str]:
    lower = text.lower()

    return [
        keyword
        for keyword in DRUG_KEYWORDS
        if keyword.lower() in lower
    ]


def extract_brands(text: str) -> List[str]:
    lower = text.lower()

    brands = []

    for brand in VAPE_BRANDS:
        if brand.lower() in lower:
            brands.append(brand)

    for brand in ALCOHOL_BRANDS:
        if brand.lower() in lower:
            brands.append(brand)

    return unique(brands)


def extract_prices(text: str) -> List[str]:
    return unique(PRICE_REGEX.findall(text))


def extract_entities(text: str) -> Dict:
    return {
        "telegram_handles": extract_telegram(text),
        "phones": extract_phones(text),
        "wallets": extract_wallets(text),
        "domains": extract_domains(text),
        "urls": extract_urls(text),
        "locations": extract_locations(text),
        "substances": extract_substances(text),
        "brands": extract_brands(text),
        "prices": extract_prices(text),
    }