from typing import Optional

BANK_REGISTRY = {
    "kaspi": {"full_name": "Kaspi Bank", "country": "Kazakhstan", "bic": "CASPKZKA", "risk_level": "high"},
    "halyk": {"full_name": "Halyk Bank", "country": "Kazakhstan", "bic": "HSBKKZKX", "risk_level": "medium"},
    "forte": {"full_name": "ForteBank", "country": "Kazakhstan", "bic": "IRTYKZKA", "risk_level": "medium"},
    "jusan": {"full_name": "Jusan Bank", "country": "Kazakhstan", "bic": "KINCKZKA", "risk_level": "medium"},
    "tinkoff": {"full_name": "Tinkoff Bank", "country": "Russia", "bic": "TCSBRUMM", "risk_level": "high"},
}


def identify_bank(bank_keyword: str) -> dict:
    key = bank_keyword.lower().strip()
    for bank_key, info in BANK_REGISTRY.items():
        if bank_key in key or key in bank_key:
            return {"keyword": bank_keyword, **info}
    return {"keyword": bank_keyword, "full_name": "Unknown Bank", "risk_level": "unknown"}


def enrich_banks(bank_list: list) -> list:
    return [identify_bank(b) for b in bank_list]
