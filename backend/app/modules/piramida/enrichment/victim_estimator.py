KZT_PER_USD = 450.0
AVG_INVESTMENT_USD = 200.0


def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


class VictimEstimator:
    def estimate(self, member_count: int, inflow_usdt: float = 0) -> dict:
        member_count = safe_float(member_count, 0.0)
        inflow_usdt = safe_float(inflow_usdt, 0.0)

        estimated_victims = int(member_count * 0.15)

        if inflow_usdt > 0:
            victims_by_wallet = int(inflow_usdt / AVG_INVESTMENT_USD)
            estimated_victims = max(estimated_victims, victims_by_wallet)

        estimated_funds_usd = max(
            estimated_victims * AVG_INVESTMENT_USD,
            inflow_usdt if inflow_usdt > 0 else 0,
        )

        return {
            "estimated_victims": estimated_victims,
            "estimated_funds_usd": round(estimated_funds_usd, 2),
            "estimated_funds_kzt": round(estimated_funds_usd * KZT_PER_USD, 2),
            "methodology": "15% channel member participation rate + wallet inflow cross-check",
            "confidence": "medium",
        }


victim_estimator = VictimEstimator()