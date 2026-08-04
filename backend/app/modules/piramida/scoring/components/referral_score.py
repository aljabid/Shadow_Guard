def score(referral_analysis: dict) -> float:
    if not referral_analysis:
        return 0.0
    s = 0.0
    if referral_analysis.get("has_referral_program"):
        s += 50.0
    if referral_analysis.get("is_multilevel"):
        s += 40.0
    s += referral_analysis.get("confidence", 0) * 10
    return round(min(s, 100), 1)
