from datetime import datetime
from typing import List


def generate_blocking_request(platforms: List[dict], analyst_name: str = "ShadowGuard System",
                              case_number: str = "") -> dict:
    domains_to_block = []
    for platform in platforms:
        if not platform.get("is_licensed", True):
            domains_to_block.extend(platform.get("affiliated_domains", []))
            if platform.get("platform_name"):
                domains_to_block.append(platform["platform_name"])
    domains_to_block = list(set(domains_to_block))
    return {
        "document_type": "AFM Domain Blocking Request",
        "request_date": datetime.utcnow().strftime("%Y-%m-%d"),
        "case_number": case_number or f"SG-{datetime.utcnow().strftime('%Y%m%d%H%M')}",
        "requesting_authority": "ShadowGuard Intelligence Platform / AFM",
        "analyst": analyst_name,
        "legal_basis": [
            "Article 307 Criminal Code of Kazakhstan — Illegal gambling organization",
            "AFM Directive May 2026 — Mobile payment blocking for illegal casinos",
            "Law on Communications — Domain blocking authority",
        ],
        "domains_for_blocking": domains_to_block,
        "total_domains": len(domains_to_block),
        "evidence_summary": (
            f"{len(platforms)} illegal platforms detected with no AIFC/BAC license. "
            f"{len(domains_to_block)} domains identified for blocking."
        ),
        "submission_target": "Ministry of Culture and Information of Kazakhstan",
        "generated_at": datetime.utcnow().isoformat(),
    }
