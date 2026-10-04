MOBILE_PAYMENT_INDICATORS = [
    "мобильный баланс","mobile balance","пополнение с телефона",
    "смс оплата","sms payment","operator payment",
    "beeline","kcell","activ","tele2","altel",
    "мобильный счет","телефон",
]

TELECOM_OPERATORS_KZ = ["beeline","kcell","activ","tele2","altel"]


def detect_mobile_payments(text: str) -> dict:
    text_lower = text.lower()
    indicators_found = [kw for kw in MOBILE_PAYMENT_INDICATORS if kw in text_lower]
    operators_found = [op for op in TELECOM_OPERATORS_KZ if op in text_lower]
    is_using_mobile = len(indicators_found) > 0
    return {
        "uses_mobile_balance": is_using_mobile,
        "indicators_found": indicators_found,
        "telecom_operators": operators_found,
        "regulatory_note": (
            "AFM May 2026 directive requires telecom operators to block "
            "payments to illegal gambling accounts via mobile balance."
            if is_using_mobile else None
        ),
    }
