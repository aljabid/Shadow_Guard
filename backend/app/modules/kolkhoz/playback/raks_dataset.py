from typing import List

RAKS_TIMELINE = [
    {"timestamp": "2025-09-27T08:00:00", "event": "Complaint surge begins", "signal": "complaint_surge",
     "score_contribution": 15, "details": "12 complaints detected across darknet forums about withdrawal delays"},
    {"timestamp": "2025-09-27T14:00:00", "event": "Support response time increases", "signal": "support_silence",
     "score_contribution": 10, "details": "Average support response time went from 2h to 8h"},
    {"timestamp": "2025-09-28T09:00:00", "event": "Wallet outflow anomaly detected", "signal": "wallet_outflow_drop",
     "score_contribution": 20, "details": "3 monitored wallets showing unusual outflow patterns"},
    {"timestamp": "2025-09-28T16:00:00", "event": "Complaint spike on darknet forums", "signal": "complaint_surge",
     "score_contribution": 25, "details": "47 new complaints in 6 hours — spike pattern detected"},
    {"timestamp": "2025-09-29T06:00:00", "event": "ALERT THRESHOLD REACHED — Score: 71",
     "signal": "composite", "score_contribution": 0,
     "details": "System would have fired AFM alert here — 14h before actual action",
     "alert_fired": True, "score_at_event": 71},
    {"timestamp": "2025-09-29T10:00:00", "event": "Support channel goes completely silent",
     "signal": "support_silence", "score_contribution": 15, "details": "Zero responses in 8+ hours."},
    {"timestamp": "2025-09-29T18:00:00", "event": "Domain shows timeout errors",
     "signal": "domain_downtime", "score_contribution": 10, "details": "raks-exchange.com returning 503"},
    {"timestamp": "2025-09-29T22:00:00", "event": "Score reaches 91 — CRITICAL",
     "signal": "composite", "score_contribution": 0, "details": "All 5 signals firing simultaneously",
     "score_at_event": 91},
    {"timestamp": "2025-09-30T06:00:00", "event": "AFM ACTUAL ACTION — Wallets frozen",
     "signal": "afm_action", "score_contribution": 0,
     "details": "AFM froze 67 wallets, 9.7M USDT. Our alert was 14 hours earlier.",
     "is_afm_action": True},
]


async def get_raks_playback() -> List[dict]:
    cumulative_score = 0.0
    results = []
    from app.modules.kolkhoz.scoring.signal_weights import get_risk_level
    for event in RAKS_TIMELINE:
        cumulative_score = event.get("score_at_event", cumulative_score + event.get("score_contribution", 0))
        cumulative_score = min(cumulative_score, 100)
        results.append({
            "exchange_name": "RAKS Exchange (Historical Playback)",
            "risk_score": round(cumulative_score, 1),
            "risk_level": get_risk_level(cumulative_score),
            "timestamp": event["timestamp"],
            "event_label": event["event"],
            "event_signal": event["signal"],
            "event_details": event["details"],
            "alert_fired": event.get("alert_fired", cumulative_score >= 65),
            "is_afm_action": event.get("is_afm_action", False),
            "signals": [],
            "complaint_count": 0,
            "wallet_outflow_delta": None,
            "domain_status": None,
        })
    return results
