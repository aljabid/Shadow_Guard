from datetime import datetime
from typing import List


def build_shadowbet_evidence(results: List[dict], operators: List[dict], task_id: str) -> dict:
    total_reach = sum(r.get("total_reach", 0) for r in results)
    illegal_count = len([r for r in results if not r.get("is_licensed", True)])
    return {
        "report_type": "ŞADOW BET Illegal Gambling Intelligence Report",
        "generated_at": datetime.utcnow().isoformat(),
        "task_id": task_id,
        "executive_summary": (
            f"Automated scan detected {len(results)} illegal gambling platforms "
            f"without AIFC/BAC licensing. "
            f"{len(operators)} distinct operator networks identified. "
            f"Combined estimated audience reach: {total_reach:,} users."
        ),
        "statistics": {
            "platforms_detected": len(results),
            "illegal_platforms": illegal_count,
            "operator_networks": len(operators),
            "total_audience_reach": total_reach,
        },
        "top_platforms": sorted(results, key=lambda x: x.get("risk_score", 0), reverse=True)[:5],
        "operator_networks": operators[:3],
        "recommended_action": (
            "Submit domain blocking requests to Ministry of Culture and Information. "
            "Issue mobile payment blocking directive to KZ telecom operators. "
            "Cross-reference wallet addresses with KOLKHOZ exchange watchlist."
        ),
        "legal_basis": (
            "Article 307 of the Criminal Code of Kazakhstan (Illegal organization of gambling). "
            "AFM Directive May 2026 on mobile payment blocking."
        ),
    }
