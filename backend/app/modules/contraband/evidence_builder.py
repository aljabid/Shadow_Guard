from datetime import datetime
from typing import Dict, List


def _safe_list(values) -> List[str]:
    if not values:
        return []

    if isinstance(values, list):
        return [str(v) for v in values if v]

    return [str(values)]


def build_evidence_items(findings: List[Dict]) -> List[Dict]:
    evidence_items: List[Dict] = []

    for index, finding in enumerate(findings):
        entities = finding.get("entities") or {}

        evidence_urls = _safe_list(finding.get("evidence_urls"))
        source_url = finding.get("source_url")

        if source_url:
            evidence_urls.append(source_url)

        evidence_urls = list(dict.fromkeys(evidence_urls))

        evidence_items.append(
            {
                "evidence_id": f"contraband_evidence_{index}",
                "module_id": "contraband",
                "finding_index": index,
                "title": finding.get("title", f"Contraband finding {index + 1}"),
                "crime_category": finding.get("crime_category"),
                "risk_score": int(finding.get("risk_score") or 0),
                "risk_level": finding.get("risk_level", "low"),
                "source_type": finding.get("source_type"),
                "source_name": finding.get("source_name"),
                "source_url": source_url,
                "evidence_urls": evidence_urls,
                "city": finding.get("city"),
                "country": finding.get("country", "Kazakhstan"),
                "telegram_handles": _safe_list(entities.get("telegram_handles")),
                "phones": _safe_list(entities.get("phones")),
                "wallets": _safe_list(entities.get("wallets")),
                "domains": _safe_list(entities.get("domains")),
                "locations": _safe_list(entities.get("locations")),
                "substances": _safe_list(entities.get("substances")),
                "brands": _safe_list(entities.get("brands")),
                "prices": _safe_list(entities.get("prices")),
                "analyst_summary": finding.get("analyst_summary"),
                "red_flags": _safe_list(finding.get("red_flags")),
                "recommended_actions": _safe_list(finding.get("recommended_actions")),
                "raw_text_excerpt": finding.get("raw_text_excerpt"),
                "created_at": datetime.utcnow().isoformat(),
            }
        )

    return evidence_items


def build_evidence_summary(findings: List[Dict]) -> Dict:
    high_risk = [
        f for f in findings if int(f.get("risk_score") or 0) >= 70
    ]

    critical = [
        f for f in findings if int(f.get("risk_score") or 0) >= 85
    ]

    darknet = [
        f for f in findings if str(f.get("source_type")) == "darknet"
    ]

    telegram = [
        f for f in findings if str(f.get("source_type")) == "telegram"
    ]

    wallets = []
    phones = []
    telegram_handles = []
    locations = []

    for finding in findings:
        entities = finding.get("entities") or {}

        wallets.extend(_safe_list(entities.get("wallets")))
        phones.extend(_safe_list(entities.get("phones")))
        telegram_handles.extend(_safe_list(entities.get("telegram_handles")))
        locations.extend(_safe_list(entities.get("locations")))

    return {
        "module_id": "contraband",
        "generated_at": datetime.utcnow().isoformat(),
        "total_findings": len(findings),
        "critical_findings": len(critical),
        "high_risk_findings": len(high_risk),
        "darknet_findings": len(darknet),
        "telegram_findings": len(telegram),
        "unique_wallets": len(set(wallets)),
        "unique_phones": len(set(phones)),
        "unique_telegram_handles": len(set(telegram_handles)),
        "unique_locations": len(set(locations)),
    }


def build_evidence_package(findings: List[Dict]) -> Dict:
    evidence_items = build_evidence_items(findings)
    summary = build_evidence_summary(findings)

    return {
        "module_id": "contraband",
        "package_type": "contraband_intelligence",
        "title": "CONTRABAND-KZ Evidence Package",
        "summary": summary,
        "evidence_items": evidence_items,
        "recommended_next_steps": [
            "Review critical and high-risk contraband findings first.",
            "Preserve Telegram, DarkNet, web, and Instagram evidence URLs.",
            "Correlate phones, wallets, domains, and Telegram handles across modules.",
            "Escalate confirmed drug/drop-network indicators for analyst review.",
            "Map Kazakhstan locations for regional threat prioritization.",
        ],
    }