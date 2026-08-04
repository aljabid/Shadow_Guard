from datetime import datetime
from typing import Dict, List


def generate_report(findings: List[Dict]) -> Dict:
    total = len(findings)

    critical = len(
        [f for f in findings if int(f.get("risk_score", 0)) >= 85]
    )

    high = len(
        [
            f
            for f in findings
            if 70 <= int(f.get("risk_score", 0)) < 85
        ]
    )

    medium = len(
        [
            f
            for f in findings
            if 40 <= int(f.get("risk_score", 0)) < 70
        ]
    )

    low = len(
        [f for f in findings if int(f.get("risk_score", 0)) < 40]
    )

    categories = {}

    for finding in findings:
        category = finding.get(
            "crime_category",
            "UNKNOWN",
        )

        categories[category] = (
            categories.get(category, 0) + 1
        )

    top_findings = sorted(
        findings,
        key=lambda x: int(x.get("risk_score", 0)),
        reverse=True,
    )[:10]

    return {
        "report_type": "CONTRABAND_KZ",
        "generated_at": datetime.utcnow().isoformat(),
        "summary": {
            "total_findings": total,
            "critical": critical,
            "high": high,
            "medium": medium,
            "low": low,
        },
        "category_breakdown": categories,
        "top_findings": top_findings,
        "analyst_recommendations": [
            "Review critical contraband findings immediately.",
            "Preserve Telegram and DarkNet evidence.",
            "Correlate wallets, phones and Telegram handles.",
            "Escalate drug distribution indicators.",
            "Track recurring Kazakhstan locations.",
            "Monitor linked courier and delivery patterns.",
        ],
    }


def build_case_summary(findings: List[Dict]) -> str:
    critical = len(
        [f for f in findings if int(f.get("risk_score", 0)) >= 85]
    )

    high = len(
        [f for f in findings if int(f.get("risk_score", 0)) >= 70]
    )

    return (
        f"CONTRABAND-KZ identified "
        f"{len(findings)} intelligence findings, "
        f"including {critical} critical findings and "
        f"{high} high-risk findings."
    )


def build_executive_brief(findings: List[Dict]) -> Dict:
    return {
        "title": "CONTRABAND-KZ Executive Intelligence Brief",
        "created_at": datetime.utcnow().isoformat(),
        "overview": build_case_summary(findings),
        "priority": (
            "CRITICAL"
            if any(
                int(f.get("risk_score", 0)) >= 85
                for f in findings
            )
            else "NORMAL"
        ),
    }