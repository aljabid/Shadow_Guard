from typing import List


def build_score_timeline(events: List[dict]) -> dict:
    timestamps = [e["timestamp"] for e in events]
    scores = [e["risk_score"] for e in events]
    alert_events = [e for e in events if e.get("alert_fired") and not e.get("is_afm_action")]
    afm_events = [e for e in events if e.get("is_afm_action")]
    first_alert = alert_events[0] if alert_events else None
    afm_action = afm_events[0] if afm_events else None
    hours_lead_time = None
    if first_alert and afm_action:
        from datetime import datetime
        alert_dt = datetime.fromisoformat(first_alert["timestamp"])
        afm_dt = datetime.fromisoformat(afm_action["timestamp"])
        hours_lead_time = round((afm_dt - alert_dt).total_seconds() / 3600, 1)
    return {
        "timestamps": timestamps,
        "scores": scores,
        "first_alert_timestamp": first_alert["timestamp"] if first_alert else None,
        "first_alert_score": first_alert["risk_score"] if first_alert else None,
        "afm_action_timestamp": afm_action["timestamp"] if afm_action else None,
        "hours_lead_time": hours_lead_time,
        "summary": f"System alert fired {hours_lead_time}h before AFM action" if hours_lead_time else "Timeline analysis complete",
    }
