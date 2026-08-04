from typing import Optional
KNOWN_CASE_PATTERNS = {
    "amir_capital": {"return_min": 5.0, "return_max": 10.0, "period": "monthly", "crypto_used": True},
}


def match_known_pattern(scraped_data: dict) -> Optional[dict]:
    max_return = scraped_data.get("max_monthly_return")
    has_referral = scraped_data.get("referral_analysis", {}).get("has_referral_program")
    wallet_count = scraped_data.get("wallet_count", 0)
    for pattern_name, pattern in KNOWN_CASE_PATTERNS.items():
        if max_return is None:
            continue
        if pattern["return_min"] <= max_return <= pattern["return_max"] * 1.5 and has_referral and wallet_count > 0:
            return {"matched_pattern": pattern_name, "confidence": 0.85, "details": pattern}
    return None
