def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def score(weekly_growth: int, member_count: int) -> float:
    weekly_growth = safe_float(weekly_growth, 0.0)
    member_count = safe_float(member_count, 0.0)

    if member_count <= 0:
        return 0.0

    growth_rate = weekly_growth / max(member_count, 1.0)

    if growth_rate > 0.5:
        return 100.0
    if growth_rate > 0.2:
        return 75.0
    if growth_rate > 0.1:
        return 50.0
    if growth_rate > 0.05:
        return 25.0
    if weekly_growth > 1000:
        return 60.0
    if weekly_growth > 500:
        return 40.0
    if weekly_growth > 100:
        return 20.0

    return 0.0