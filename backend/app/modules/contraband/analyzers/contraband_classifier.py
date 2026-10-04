from enum import Enum
from typing import Any, Dict, List, Tuple

from app.modules.contraband.analyzers.alcohol_analyzer import (
    analyze_alcohol_sources,
)
from app.modules.contraband.analyzers.courier_analyzer import (
    analyze_courier_sources,
)
from app.modules.contraband.analyzers.drug_analyzer import (
    analyze_drug_sources,
)
from app.modules.contraband.analyzers.vape_analyzer import (
    analyze_vape_sources,
)


def normalize_category(value: Any) -> str:
    if value is None:
        return "OSINT_FINDING"

    if isinstance(value, Enum):
        return value.name.upper()

    raw = str(value).strip()

    if "." in raw:
        raw = raw.split(".")[-1]

    return raw.upper().replace(" ", "_").replace("-", "_")


def normalize_source_type(value: Any) -> str:
    if value is None:
        return "unknown"

    if isinstance(value, Enum):
        return value.value

    raw = str(value).strip()

    if "." in raw:
        raw = raw.split(".")[-1]

    return raw.lower()


def normalize_finding(finding: Dict) -> Dict:
    normalized = dict(finding)

    normalized["crime_category"] = normalize_category(
        normalized.get("crime_category")
    )

    normalized["source_type"] = normalize_source_type(
        normalized.get("source_type")
    )

    return normalized


def _finding_key(finding: Dict) -> Tuple[str, str, str]:
    title = str(finding.get("title") or "").strip().lower()
    category = normalize_category(finding.get("crime_category")).lower()
    source_url = str(finding.get("source_url") or "").strip().lower()

    return title, category, source_url


def deduplicate_findings(findings: List[Dict]) -> List[Dict]:
    seen = {}
    final_findings: List[Dict] = []

    for finding in findings:
        finding = normalize_finding(finding)
        key = _finding_key(finding)

        if key not in seen:
            seen[key] = len(final_findings)
            final_findings.append(finding)
            continue

        existing_index = seen[key]
        existing = final_findings[existing_index]

        existing_score = int(existing.get("risk_score") or 0)
        new_score = int(finding.get("risk_score") or 0)

        if new_score > existing_score:
            final_findings[existing_index] = finding

    return final_findings


def sort_findings(findings: List[Dict]) -> List[Dict]:
    return sorted(
        findings,
        key=lambda item: int(item.get("risk_score") or 0),
        reverse=True,
    )


def classify_contraband_sources(sources: List[Dict]) -> List[Dict]:
    all_findings: List[Dict] = []

    all_findings.extend(analyze_drug_sources(sources))
    all_findings.extend(analyze_vape_sources(sources))
    all_findings.extend(analyze_alcohol_sources(sources))
    all_findings.extend(analyze_courier_sources(sources))

    normalized = [normalize_finding(f) for f in all_findings]
    deduped = deduplicate_findings(normalized)
    ranked = sort_findings(deduped)

    return ranked


def build_category_counts(findings: List[Dict]) -> Dict[str, int]:
    counts: Dict[str, int] = {}

    for finding in findings:
        category = normalize_category(
            finding.get("crime_category") or "OSINT_FINDING"
        )
        counts[category] = counts.get(category, 0) + 1

    return counts


def build_summary_counts(findings: List[Dict]) -> Dict[str, int]:
    drug_categories = {
        "DRUG_VENDOR",
        "DRUG_DROP_NETWORK",
        "DRUG_COURIER_NETWORK",
        "CONTRABAND_MARKETPLACE",
    }

    vape_categories = {
        "VAPE_SMUGGLING",
        "VAPE_WHOLESALE",
        "UNLICENSED_VAPE_SALE",
    }

    alcohol_categories = {
        "ALCOHOL_SMUGGLING",
        "COUNTERFEIT_ALCOHOL",
        "UNLICENSED_ALCOHOL_SALE",
    }

    courier_categories = {
        "DRUG_COURIER_NETWORK",
        "DRUG_DROP_NETWORK",
    }

    normalized_findings = [
        {
            **finding,
            "crime_category": normalize_category(
                finding.get("crime_category")
            ),
        }
        for finding in findings
    ]

    return {
        "findings_count": len(normalized_findings),
        "drug_findings": len(
            [
                f
                for f in normalized_findings
                if f.get("crime_category") in drug_categories
            ]
        ),
        "vape_findings": len(
            [
                f
                for f in normalized_findings
                if f.get("crime_category") in vape_categories
            ]
        ),
        "alcohol_findings": len(
            [
                f
                for f in normalized_findings
                if f.get("crime_category") in alcohol_categories
            ]
        ),
        "courier_networks": len(
            [
                f
                for f in normalized_findings
                if f.get("crime_category") in courier_categories
            ]
        ),
        "high_risk_findings": len(
            [
                f
                for f in normalized_findings
                if int(f.get("risk_score") or 0) >= 70
            ]
        ),
        "alerts_fired": len(
            [
                f
                for f in normalized_findings
                if int(f.get("risk_score") or 0) >= 40
            ]
        ),
    }