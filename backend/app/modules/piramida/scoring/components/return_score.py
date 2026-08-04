from typing import Optional


def score(max_monthly_return: Optional[float]) -> float:
    if max_monthly_return is None:
        return 0.0
    if max_monthly_return >= 20:
        return 100.0
    if max_monthly_return >= 10:
        return 90.0
    if max_monthly_return >= 5:
        return 75.0
    if max_monthly_return >= 3:
        return 55.0
    if max_monthly_return >= 1:
        return 20.0
    return 0.0
