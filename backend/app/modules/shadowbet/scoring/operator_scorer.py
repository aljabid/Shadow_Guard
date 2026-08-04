AVG_BET_KZT = 5000.0


class OperatorScorer:
    def score(self, operator: dict) -> dict:
        domain_count = operator.get("domain_count", 0)
        influencer_count = operator.get("influencer_count", 0)
        wallet_count = len(operator.get("wallet_addresses", []))
        threat_score = round(
            min(domain_count * 15, 40)
            + min(influencer_count * 10, 30)
            + min(wallet_count * 10, 30),
            1,
        )
        total_reach = operator.get("influencer_count", 0) * 5000
        estimated_weekly_revenue = int(total_reach * 0.05) * AVG_BET_KZT
        return {
            **operator,
            "threat_score": threat_score,
            "threat_level": self._level(threat_score),
            "estimated_weekly_revenue_kzt": round(estimated_weekly_revenue, 2),
            "alert_fired": threat_score >= 60,
        }

    def _level(self, score: float) -> str:
        if score >= 80: return "critical"
        if score >= 60: return "high"
        if score >= 40: return "medium"
        return "low"


operator_scorer = OperatorScorer()
