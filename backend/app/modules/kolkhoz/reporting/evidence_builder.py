from datetime import datetime
from typing import List


def build_kolkhoz_evidence(exchange_name: str, risk_score: float, risk_level: str,
                           signals: List[dict], task_id: str) -> dict:
    return {
        "report_type": "KOLKHOZ Exchange Collapse Signal Report",
        "generated_at": datetime.utcnow().isoformat(),
        "task_id": task_id,
        "subject": {"exchange_name": exchange_name, "risk_score": risk_score, "risk_level": risk_level.upper()},
        "executive_summary": (
            f"The shadow exchange '{exchange_name}' received a risk score of {risk_score}/100 "
            f"({risk_level.upper()}) based on automated OSINT monitoring."
        ),
        "signals_detected": signals,
        "recommended_action": (
            "Immediate review recommended. Consider emergency wallet freeze if score exceeds 85."
            if risk_score >= 65 else "Continue monitoring. No immediate action required."
        ),
        "legal_basis": "Law of Kazakhstan No. 88-V on Countering Legalization of Proceeds from Crime.",
    }
