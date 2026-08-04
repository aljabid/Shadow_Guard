from typing import List

AMIR_CAPITAL_TIMELINE = [
    {"timestamp": "2025-01-15T09:00:00", "event": "Channel launched — recruitment begins",
     "risk_score": 22, "details": "Initial posts promising 5-10% monthly returns from crypto trading.",
     "member_count": 120, "estimated_victims": 50, "estimated_funds_kzt": 2500000},
    {"timestamp": "2025-02-01T10:00:00", "event": "Return promise extracted — 10%/month flagged",
     "risk_score": 45, "details": "NLP extraction: '10% monthly guaranteed'. No AIFC registration found.",
     "member_count": 890, "estimated_victims": 320, "estimated_funds_kzt": 16000000},
    {"timestamp": "2025-02-20T14:00:00", "event": "Referral structure detected — MLM pattern",
     "risk_score": 62, "details": "Referral program detected: 'Earn 2% from each person you invite'.",
     "member_count": 2400, "estimated_victims": 800, "estimated_funds_kzt": 40000000},
    {"timestamp": "2025-03-05T08:00:00", "event": "SYSTEM ALERT — Score 71, high risk",
     "risk_score": 71, "details": "All signals firing. Wallet detected receiving 50,000+ USDT.",
     "member_count": 4200, "estimated_victims": 1400, "estimated_funds_kzt": 70000000,
     "alert_fired": True},
    {"timestamp": "2025-04-10T00:00:00", "event": "Cross-border expansion — KG, BY, RU recruitment",
     "risk_score": 84, "details": "Same messaging detected in Kyrgyz and Russian Telegram channels.",
     "member_count": 8500, "estimated_victims": 2800, "estimated_funds_kzt": 140000000},
    {"timestamp": "2025-09-15T00:00:00", "event": "AFM ACTION — $10M seized, lead organizer arrested",
     "risk_score": 96, "details": "AFM Almaty Department seized $10M in crypto. 40+ people implicated.",
     "member_count": 15000, "estimated_victims": 5000, "estimated_funds_kzt": 480000000,
     "is_afm_action": True},
]


def _get_level(score: float) -> str:
    if score >= 85:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


async def get_amir_playback() -> List[dict]:
    results = []
    for event in AMIR_CAPITAL_TIMELINE:
        results.append({
            "scheme_name": "Amir Capital (Historical Playback)",
            "channel": "amir_capital_invest",
            "risk_score": event["risk_score"],
            "risk_level": _get_level(event["risk_score"]),
            "timestamp": event["timestamp"],
            "event_label": event["event"],
            "event_details": event["details"],
            "member_count": event["member_count"],
            "estimated_victims": event["estimated_victims"],
            "estimated_funds_at_risk_kzt": event["estimated_funds_kzt"],
            "alert_fired": event.get("alert_fired", event["risk_score"] >= 70),
            "is_afm_action": event.get("is_afm_action", False),
            "score_components": [], "wallet_addresses": [], "is_registered": False,
        })
    return results
