from typing import List
from collections import defaultdict
from datetime import datetime


def compute_sentiment_trend(classified_messages: List[dict], window_hours: int = 24) -> dict:
    if not classified_messages:
        return {"complaint_rate": 0.0, "trend": "stable", "hourly_buckets": {}}
    hourly = defaultdict(lambda: {"complaint": 0, "shutdown": 0, "total": 0})
    for msg in classified_messages:
        label = msg.get("label", "neutral")
        date_str = msg.get("date")
        try:
            dt = datetime.fromisoformat(date_str) if date_str else datetime.utcnow()
            hour_key = dt.strftime("%Y-%m-%d %H:00")
        except Exception:
            hour_key = "unknown"
        hourly[hour_key]["total"] += 1
        if label in ("complaint", "urgent_complaint"):
            hourly[hour_key]["complaint"] += 1
        elif label == "shutdown_signal":
            hourly[hour_key]["shutdown"] += 1
    total = len(classified_messages)
    complaint_count = sum(1 for m in classified_messages
                         if m.get("label") in ("complaint", "urgent_complaint", "shutdown_signal"))
    complaint_rate = complaint_count / max(total, 1)
    sorted_hours = sorted(hourly.keys())
    trend = "stable"
    if len(sorted_hours) >= 2:
        mid = len(sorted_hours) // 2
        def avg_rate(keys):
            tc = sum(hourly[k]["complaint"] + hourly[k]["shutdown"] for k in keys)
            tt = sum(hourly[k]["total"] for k in keys)
            return tc / max(tt, 1)
        early = avg_rate(sorted_hours[:mid])
        late = avg_rate(sorted_hours[mid:])
        if late > early * 2.5:
            trend = "spike"
        elif late > early * 1.5:
            trend = "increasing"
    return {
        "complaint_rate": round(complaint_rate, 3),
        "trend": trend,
        "total_messages": total,
        "complaint_count": complaint_count,
        "hourly_buckets": dict(hourly),
    }
