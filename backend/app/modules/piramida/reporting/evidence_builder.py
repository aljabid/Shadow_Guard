from datetime import datetime
from typing import List


def build_piramida_evidence(results: List[dict], task_id: str) -> dict:
    total_victims = sum(r.get("estimated_victims", 0) or 0 for r in results)
    total_funds = sum(r.get("estimated_funds_at_risk_kzt", 0) or 0 for r in results)
    high_risk = [r for r in results if r.get("risk_score", 0) >= 70]
    return {
        "report_type": "PIRAMIDA Financial Pyramid Intelligence Report",
        "generated_at": datetime.utcnow().isoformat(),
        "task_id": task_id,
        "executive_summary": (
            f"Automated scan detected {len(results)} suspected pyramid schemes. "
            f"{len(high_risk)} classified as high-risk or critical. "
            f"Total estimated victims: {total_victims:,}. "
            f"Total funds at risk: {total_funds:,.0f} KZT."
        ),
        "statistics": {"schemes_detected": len(results), "high_risk_schemes": len(high_risk),
                       "estimated_victims": total_victims, "estimated_funds_kzt": total_funds},
        "high_risk_schemes": high_risk[:5],
        "recommended_action": "Initiate formal investigation for high-risk schemes. Freeze associated crypto wallets.",
        "legal_basis": "Article 217 of the Criminal Code of Kazakhstan (Financial pyramid scheme).",
    }
