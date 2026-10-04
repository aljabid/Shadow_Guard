"""
Domain intelligence collector.

Gathers passive intelligence on domains found during scans:
- Validates domain format and resolves to IP via DNS
- Performs WHOIS lookup (async, no external API key required)
- Checks for privacy proxy / hidden registrant
- Checks SecurityTrails API if configured (Settings → API Integrations)
- Returns a risk-scored dict per domain

Falls back gracefully when DNS or WHOIS is unreachable.
"""

import asyncio
import re
import socket
import logging
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

DOMAIN_RE = re.compile(
    r"(?:https?://)?(?:www\.)?([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?(?:\.[a-z]{2,})+)",
    re.I,
)

HIGH_RISK_TLDS = {".ru", ".io", ".xyz", ".top", ".tk", ".ml", ".ga", ".cf"}
PRIVACY_REGISTRARS = {
    "whoisguard", "privacyprotect", "domainsbyproxy", "perfect privacy",
    "privacy protect", "withheld for privacy", "redacted for privacy",
}


def extract_domains(text: str) -> list[str]:
    """Pull unique domain strings from arbitrary text."""
    matches = DOMAIN_RE.findall(text.lower())
    seen: set[str] = set()
    result = []
    for m in matches:
        if m not in seen and len(m) <= 253:
            seen.add(m)
            result.append(m)
    return result


def _sync_resolve(domain: str) -> Optional[str]:
    """Synchronous DNS resolution — run in executor."""
    try:
        return socket.gethostbyname(domain)
    except Exception:
        return None


async def resolve_ip(domain: str, timeout: float = 4.0) -> Optional[str]:
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _sync_resolve, domain),
            timeout=timeout,
        )
    except Exception:
        return None


async def whois_lookup(domain: str) -> dict:
    """
    Minimal WHOIS lookup via whois.iana.org TCP (port 43).
    Falls back to empty dict on any error.
    """
    result: dict = {}
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection("whois.iana.org", 43), timeout=6
        )
        writer.write(f"{domain}\r\n".encode())
        await writer.drain()
        raw = b""
        while True:
            chunk = await asyncio.wait_for(reader.read(4096), timeout=6)
            if not chunk:
                break
            raw += chunk
        writer.close()
        text = raw.decode(errors="ignore")
        for line in text.splitlines():
            if ":" in line:
                key, _, val = line.partition(":")
                key = key.strip().lower()
                val = val.strip()
                if key and val and key not in result:
                    result[key] = val
    except Exception as exc:
        logger.debug(f"WHOIS lookup failed for {domain}: {exc}")
    return result


async def securitytrails_lookup(domain: str) -> dict:
    """
    Query SecurityTrails API for domain history if key is configured.
    Returns empty dict when API key is not set.
    """
    try:
        from app.services.api_key_loader import api_key_loader
        key = api_key_loader.get("securitytrails", "api_key")
        if not key:
            return {}
        url = f"https://api.securitytrails.com/v1/domain/{domain}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers={"APIKEY": key})
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.debug(f"SecurityTrails lookup failed for {domain}: {exc}")
    return {}


async def shodan_lookup(ip: str) -> dict:
    """Query Shodan host API for open ports and services. Returns empty dict if key missing."""
    try:
        from app.services.api_key_loader import api_key_loader
        key = api_key_loader.shodan_key()
        if not key or not ip:
            return {}
        url = f"https://api.shodan.io/shodan/host/{ip}?key={key}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "ports": data.get("ports", []),
                    "isp": data.get("isp"),
                    "org": data.get("org"),
                    "country_code": data.get("country_code"),
                    "hostnames": data.get("hostnames", []),
                    "vulns": list(data.get("vulns", {}).keys()),
                    "tags": data.get("tags", []),
                }
    except Exception as exc:
        logger.debug(f"Shodan lookup failed for {ip}: {exc}")
    return {}


async def virustotal_lookup(domain: str) -> dict:
    """Query VirusTotal domain reputation. Returns empty dict if key missing."""
    try:
        from app.services.api_key_loader import api_key_loader
        key = api_key_loader.virustotal_key()
        if not key:
            return {}
        url = f"https://www.virustotal.com/api/v3/domains/{domain}"
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers={"x-apikey": key})
            if resp.status_code == 200:
                data = resp.json()
                attrs = data.get("data", {}).get("attributes", {})
                stats = attrs.get("last_analysis_stats", {})
                return {
                    "malicious": stats.get("malicious", 0),
                    "suspicious": stats.get("suspicious", 0),
                    "harmless": stats.get("harmless", 0),
                    "undetected": stats.get("undetected", 0),
                    "reputation": attrs.get("reputation", 0),
                    "categories": attrs.get("categories", {}),
                    "creation_date": attrs.get("creation_date"),
                    "last_analysis_date": attrs.get("last_analysis_date"),
                }
    except Exception as exc:
        logger.debug(f"VirusTotal lookup failed for {domain}: {exc}")
    return {}


def _privacy_hidden(whois_data: dict) -> bool:
    registrant = " ".join([
        str(whois_data.get("registrant", "")),
        str(whois_data.get("registrant organization", "")),
        str(whois_data.get("registrant name", "")),
    ]).lower()
    return any(p in registrant for p in PRIVACY_REGISTRARS)


def _domain_age_days(whois_data: dict) -> Optional[int]:
    for key in ("created", "creation date", "registered"):
        raw = whois_data.get(key, "")
        for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d", "%d-%b-%Y", "%Y-%m-%dT%H:%M:%S"):
            try:
                dt = datetime.strptime(raw[:19], fmt).replace(tzinfo=timezone.utc)
                return (datetime.now(timezone.utc) - dt).days
            except Exception:
                continue
    return None


async def enrich_domain(domain: str) -> dict:
    """Full passive intelligence pass on a single domain."""
    ip = await resolve_ip(domain)
    whois_data, shodan_data, vt_data = await asyncio.gather(
        whois_lookup(domain),
        shodan_lookup(ip or ""),
        virustotal_lookup(domain),
        return_exceptions=True,
    )

    if isinstance(whois_data, Exception):
        whois_data = {}
    if isinstance(shodan_data, Exception):
        shodan_data = {}
    if isinstance(vt_data, Exception):
        vt_data = {}

    tld = "." + domain.rsplit(".", 1)[-1] if "." in domain else ""
    privacy_hidden = _privacy_hidden(whois_data)
    age_days = _domain_age_days(whois_data)

    risk = 10
    risk_drivers = []

    if not ip:
        risk += 15
        risk_drivers.append("Domain does not resolve (inactive or suspended)")

    if tld in HIGH_RISK_TLDS:
        risk += 20
        risk_drivers.append(f"High-risk TLD ({tld}) commonly used by fraud operators")

    if privacy_hidden:
        risk += 25
        risk_drivers.append("Registrant hidden via privacy proxy — ownership opaque")

    if age_days is not None and age_days < 90:
        risk += 20
        risk_drivers.append(f"Newly registered domain ({age_days} days old)")

    # Shodan enrichment
    open_ports = shodan_data.get("ports", []) if isinstance(shodan_data, dict) else []
    vulns = shodan_data.get("vulns", []) if isinstance(shodan_data, dict) else []
    if vulns:
        risk += min(len(vulns) * 10, 25)
        risk_drivers.append(f"Shodan: {len(vulns)} known CVE(s) on host ({', '.join(vulns[:3])})")
    suspicious_ports = [p for p in open_ports if p in (4444, 8080, 8888, 9090, 31337)]
    if suspicious_ports:
        risk += 10
        risk_drivers.append(f"Shodan: suspicious open ports detected: {suspicious_ports}")

    # VirusTotal enrichment
    vt_malicious = vt_data.get("malicious", 0) if isinstance(vt_data, dict) else 0
    vt_suspicious = vt_data.get("suspicious", 0) if isinstance(vt_data, dict) else 0
    if vt_malicious >= 5:
        risk += 30
        risk_drivers.append(f"VirusTotal: {vt_malicious} engines flagged as malicious")
    elif vt_malicious >= 1:
        risk += 15
        risk_drivers.append(f"VirusTotal: {vt_malicious} engine(s) flagged as malicious")
    if vt_suspicious >= 3:
        risk += 10
        risk_drivers.append(f"VirusTotal: {vt_suspicious} engines flagged as suspicious")

    risk = min(risk, 95)

    return {
        "domain": domain,
        "ip": ip,
        "registrar": whois_data.get("registrar") or whois_data.get("registrant"),
        "created": whois_data.get("created") or whois_data.get("creation date"),
        "age_days": age_days,
        "privacy_hidden": privacy_hidden,
        "tld": tld,
        "risk_score": risk,
        "risk_drivers": risk_drivers,
        "entity_type": "domain",
        "whois_raw": dict(list(whois_data.items())[:10]),
        "shodan": shodan_data if isinstance(shodan_data, dict) else {},
        "virustotal": vt_data if isinstance(vt_data, dict) else {},
    }


async def enrich_domains(domain_list: list[str], max_concurrent: int = 5) -> list[dict]:
    """Enrich a list of domains concurrently."""
    from app.services.collector_status import collector_status as _cs
    _cs.mark_enabled("domain")
    _cs.mark_ready("domain")

    sem = asyncio.Semaphore(max_concurrent)

    async def _guarded(d: str) -> Optional[dict]:
        async with sem:
            try:
                return await enrich_domain(d)
            except Exception as exc:
                logger.debug(f"domain_intel error for {d}: {exc}")
                return None

    results = await asyncio.gather(*[_guarded(d) for d in domain_list])
    enriched = [r for r in results if r is not None]
    _cs.add_items("domain", len(enriched))
    if not enriched and domain_list:
        _cs.mark_error("domain", f"All {len(domain_list)} domain lookups failed (DNS/WHOIS unreachable)")
    return enriched
