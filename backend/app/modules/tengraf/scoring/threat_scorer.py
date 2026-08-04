def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def count_hits(text: str, phrases: list[str]) -> int:
    return sum(1 for phrase in phrases if phrase.lower() in text)


def score_threat(item: dict, entities: dict) -> dict:
    score = 0

    source_type = item.get("source_type")
    text = (item.get("text") or "").lower()
    title = (item.get("title") or "").lower()
    combined_text = f"{title} {text}"

    metadata = item.get("metadata") or {}

    member_count = safe_int(
        metadata.get("member_count")
        or metadata.get("participants_count")
        or item.get("member_count")
        or item.get("participants_count"),
        0,
    )

    message_count = safe_int(len(metadata.get("messages", []) or []), 0)

    telegram_count = len(entities.get("telegram_handles") or [])
    wallet_count = len(entities.get("wallets") or [])
    bank_count = len(entities.get("banks") or [])
    phone_count = len(entities.get("phones") or [])
    domain_count = len(entities.get("domains") or [])
    platform_count = len(entities.get("platforms") or [])

    # Source type base risk
    if source_type in ["marketplace", "leak_site"]:
        score += 25
    elif source_type == "forum":
        score += 15
    elif source_type == "telegram":
        score += 8
    elif source_type == "public_web":
        score += 3
    elif source_type == "github":
        score += 0

    # Entity risk
    if wallet_count:
        score += min(wallet_count * 25, 35)

    if telegram_count:
        score += min(telegram_count * 6, 18)

    if bank_count:
        score += min(bank_count * 14, 35)

    if phone_count:
        score += min(phone_count * 12, 20)

    if domain_count:
        score += min(domain_count * 6, 15)

    if platform_count:
        score += min(platform_count * 12, 25)

    # Strong combined indicators
    if wallet_count and telegram_count:
        score += 20

    if bank_count and telegram_count:
        score += 20

    if bank_count and wallet_count:
        score += 25

    if phone_count and bank_count:
        score += 15

    if platform_count and telegram_count:
        score += 15

    # Telegram scale should not create high risk alone.
    # It only matters when there are real financial crime indicators.
    has_financial_entities = (
        wallet_count > 0
        or bank_count > 0
        or phone_count > 0
        or platform_count > 0
    )

    if source_type == "telegram" and has_financial_entities:
        if member_count >= 50000:
            score += 20
        elif member_count >= 10000:
            score += 14
        elif member_count >= 2000:
            score += 8
        elif member_count >= 500:
            score += 4

        if message_count >= 20:
            score += 8
        elif message_count >= 10:
            score += 5
        elif message_count >= 5:
            score += 3

    # High-confidence financial crime phrases
    high_confidence_phrases = [
        "bank logs",
        "kaspi logs",
        "halyk logs",
        "kaspi bank logs",
        "fresh logs",
        "fullz",
        "credential dump",
        "database leak",
        "db dump",
        "leaked database",
        "stolen cards",
        "stolen card",
        "carding",
        "cashout",
        "cash out",
        "обнал",
        "обналичивание",
        "дроп карта",
        "дроп карты",
        "дроппер",
        "дропперы",
        "drop card",
        "drop cards",
        "money mule",
        "wallet sale",
        "crypto mixer",
        "laundering",
        "money laundering",
        "отмывание",
        "usdt wallet",
        "tron wallet",
        "trc20",
    ]

    medium_confidence_phrases = [
        "kaspi",
        "halyk",
        "forte",
        "jusan",
        "kaspi gold",
        "kaspi transfer",
        "halyk bank",
        "forte bank",
        "guaranteed profit",
        "guaranteed returns",
        "гарантированный доход",
        "пассивный доход",
        "financial pyramid",
        "финансовая пирамида",
        "инвестиционная схема",
        "investment scam",
        "ponzi",
        "20 percent",
        "20%",
        "1win",
        "mostbet",
        "betwinner",
        "illegal betting",
        "betting users",
        "telegram traffic",
    ]

    high_hits = count_hits(combined_text, high_confidence_phrases)
    medium_hits = count_hits(combined_text, medium_confidence_phrases)

    score += min(high_hits * 14, 45)
    score += min(medium_hits * 6, 25)

    # Penalize common false-positive areas.
    gaming_noise = [
        "cs2",
        "steam",
        "skin",
        "skins",
        "knife",
        "karambit",
        "m9",
        "doppler",
        "case",
        "inventory",
        "awp",
        "ak-47",
        "glock",
        "major",
        "team spirit",
        "vitality",
    ]

    sports_noise = [
        "football",
        "футбол",
        "transfer",
        "трансфер",
        "liga",
        "league",
        "serie a",
        "bundesliga",
        "psg",
        "real madrid",
        "barcelona",
    ]

    generic_github_noise = [
        "library",
        "tourist",
        "volunteer",
        "reservation",
        "accounting",
        "reconciliation",
        "platform for kazakhstan",
        "next.js",
        "tailwind",
    ]

    gaming_hits = count_hits(combined_text, gaming_noise)
    sports_hits = count_hits(combined_text, sports_noise)
    github_noise_hits = count_hits(combined_text, generic_github_noise)

    if gaming_hits >= 3:
        score -= 45
    elif gaming_hits >= 2:
        score -= 30
    elif gaming_hits == 1:
        score -= 15

    if sports_hits >= 3:
        score -= 35
    elif sports_hits >= 2:
        score -= 20

    if source_type == "github":
        if high_hits == 0 and medium_hits == 0 and wallet_count == 0 and bank_count == 0:
            score -= 40

        if github_noise_hits:
            score -= 25

    # Generic "drop" should not count unless tied to cards, cashout, banks, wallets, or mules.
    if "drop" in combined_text or "дроп" in combined_text:
        strong_drop_context = any(
            phrase in combined_text
            for phrase in [
                "drop card",
                "drop cards",
                "дроп карта",
                "дроп карты",
                "дроппер",
                "cashout",
                "обнал",
                "kaspi",
                "halyk",
                "bank",
                "wallet",
                "mule",
            ]
        )

        if not strong_drop_context:
            score -= 25

    # Public regulator pages are useful references but usually not threat findings.
    if source_type == "public_web":
        regulator_terms = ["afsa", "aifc", "public register", "legal framework"]
        if count_hits(combined_text, regulator_terms) >= 2 and high_hits == 0:
            score = min(score, 18)

    score = max(0, min(score, 100))

    if score >= 85:
        level = "critical"
    elif score >= 70:
        level = "high"
    elif score >= 40:
        level = "medium"
    else:
        level = "low"

    return {
        "risk_score": score,
        "risk_level": level,
        "alert_fired": score >= 40,
        "scoring_details": {
            "source_type": source_type,
            "member_count": member_count,
            "message_count": message_count,
            "telegram_count": telegram_count,
            "wallet_count": wallet_count,
            "bank_count": bank_count,
            "phone_count": phone_count,
            "domain_count": domain_count,
            "platform_count": platform_count,
            "high_confidence_hits": high_hits,
            "medium_confidence_hits": medium_hits,
            "gaming_noise_hits": gaming_hits,
            "sports_noise_hits": sports_hits,
            "github_noise_hits": github_noise_hits,
        },
    }