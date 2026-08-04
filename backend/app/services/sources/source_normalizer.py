from datetime import datetime
from typing import Any, Dict, List, Optional


def _unique(items: Optional[List[str]]) -> List[str]:
    seen = set()
    output = []

    for item in items or []:
        if not item:
            continue

        clean = str(item).strip()

        if not clean:
            continue

        key = clean.lower()

        if key not in seen:
            seen.add(key)
            output.append(clean)

    return output


def normalize_source(
    *,
    source_type: str,
    source_name: str,
    source_url: Optional[str] = None,
    evidence_urls: Optional[List[str]] = None,
    telegram_links: Optional[List[str]] = None,
    github_links: Optional[List[str]] = None,
    reddit_links: Optional[List[str]] = None,
    web_links: Optional[List[str]] = None,
    onion_links: Optional[List[str]] = None,
    domains: Optional[List[str]] = None,
    wallets: Optional[List[str]] = None,
    phones: Optional[List[str]] = None,
    raw_excerpt: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()

    return {
        "source_type": source_type,
        "source_name": source_name,
        "source_url": source_url,
        "evidence_urls": _unique(evidence_urls or ([source_url] if source_url else [])),
        "telegram_links": _unique(telegram_links),
        "github_links": _unique(github_links),
        "reddit_links": _unique(reddit_links),
        "web_links": _unique(web_links),
        "onion_links": _unique(onion_links),
        "domains": _unique(domains),
        "wallets": _unique(wallets),
        "phones": _unique(phones),
        "raw_excerpt": (raw_excerpt or "")[:2000],
        "first_seen": now,
        "last_seen": now,
        "metadata": metadata or {},
    }


def attach_source(finding: Dict[str, Any], source: Dict[str, Any]) -> Dict[str, Any]:
    finding["source"] = source
    finding["source_type"] = source.get("source_type")
    finding["source_name"] = source.get("source_name")
    finding["source_url"] = source.get("source_url")
    finding["evidence_urls"] = source.get("evidence_urls", [])
    return finding
