SIGNAL_WEIGHTS = {
    "complaint_surge": 0.30,
    "support_silence": 0.25,
    "wallet_outflow_drop": 0.25,
    "domain_downtime": 0.10,
    "social_deletion": 0.10,
}

RISK_THRESHOLDS = {"critical": 85, "high": 65, "medium": 40, "low": 0}


def get_risk_level(score: float) -> str:
    if score >= RISK_THRESHOLDS["critical"]:
        return "critical"
    if score >= RISK_THRESHOLDS["high"]:
        return "high"
    if score >= RISK_THRESHOLDS["medium"]:
        return "medium"
    return "low"
