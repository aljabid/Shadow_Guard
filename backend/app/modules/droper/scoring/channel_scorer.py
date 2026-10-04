def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(value)
    except Exception:
        return default


def safe_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return []


def score(channel_data: dict) -> float:
    s = 0.0

    rp = safe_int(channel_data.get("recruitment_post_count"), 0)
    mc = safe_int(channel_data.get("member_count"), 0)

    banks_mentioned = safe_list(channel_data.get("banks_mentioned"))
    phones_extracted = safe_list(channel_data.get("phones_extracted"))

    s += 55 if rp >= 20 else 45 if rp >= 10 else 30 if rp >= 5 else 10 if rp >= 1 else 0
    s += 20 if mc >= 5000 else 15 if mc >= 1000 else 8 if mc >= 200 else 0
    s += min(len(banks_mentioned) * 5, 20)
    s += min(len(phones_extracted) * 3, 15)

    if channel_data.get("avg_payout"):
        s += 15

    return round(min(s, 100), 1)