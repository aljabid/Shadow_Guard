import re
from typing import List
from app.modules.droper.nlp.vocabulary import BANK_KEYWORDS


def extract_phone_numbers(text: str) -> List[str]:
    pattern = r"(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}"
    return list(set(re.findall(pattern, text)))


def extract_telegram_handles(text: str) -> List[str]:
    pattern = r"@([a-zA-Z][a-zA-Z0-9_]{4,31})"
    return list(set(re.findall(pattern, text)))


def extract_banks_mentioned(text: str) -> List[str]:
    text_lower = text.lower()
    return list(set(kw for kw in BANK_KEYWORDS if kw.lower() in text_lower))


def extract_payout_amounts(text: str) -> List[dict]:
    patterns = [
        (r"(\d+)\s*%\s*(?:от|с)\s*(?:оборота|суммы)", "percentage"),
        (r"(\d+[\.,]?\d*)\s*(?:тенге|tg|kzt|₸)\s*(?:в день|за карту)", "fixed_daily"),
        (r"платим\s+(\d+)", "fixed_payment"),
    ]
    results = []
    for pattern, payout_type in patterns:
        for m in re.findall(pattern, text.lower()):
            try:
                results.append({"amount": float(m.replace(",", ".")), "type": payout_type})
            except ValueError:
                pass
    return results
