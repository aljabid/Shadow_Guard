from typing import List

PAYMENT_METHOD_MAP = {
    "kaspi": "Kaspi Pay (KZ)", "каспи": "Kaspi Pay (KZ)",
    "qiwi": "QIWI Wallet", "usdt": "USDT (TRC-20)",
    "tether": "USDT (TRC-20)", "bitcoin": "Bitcoin", "btc": "Bitcoin",
    "ethereum": "Ethereum", "eth": "Ethereum",
    "visa": "Visa Card", "mastercard": "Mastercard",
    "мобильный баланс": "Mobile Balance (KZ)",
    "mobile balance": "Mobile Balance (KZ)",
}


def extract_payment_methods(text: str) -> List[dict]:
    text_lower = text.lower()
    found = {}
    for keyword, label in PAYMENT_METHOD_MAP.items():
        if keyword in text_lower and label not in found:
            found[label] = {
                "method": label, "keyword_matched": keyword,
                "is_crypto": any(c in label for c in ["USDT", "Bitcoin", "Ethereum"]),
                "is_mobile": "Mobile" in label,
                "regulatory_risk": "HIGH" if "Mobile" in label else "MEDIUM" if "USDT" in label else "LOW",
            }
    return list(found.values())
