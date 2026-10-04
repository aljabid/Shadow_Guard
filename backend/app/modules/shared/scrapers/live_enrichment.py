"""
Live enrichment pipeline — run after a module's primary collection is complete.

Accepts the raw output dict from any module and augments it with:
  - Phone intelligence (operator, region, risk score)
  - Domain intelligence (IP, WHOIS, age, privacy proxy)
  - Blockchain wallet summary (TronGrid / Etherscan if configured)
  - Cross-entity correlation hints

All enrichment steps are best-effort: errors are logged but never propagate.
"""

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


def _collect_phones(output: dict) -> list[str]:
    phones: list[str] = []
    for item in (output.get("results") or output.get("top_channels") or output.get("findings") or []):
        phones.extend(_extract_from_item(item, "phones"))
    return phones


def _collect_domains(output: dict) -> list[str]:
    domains: list[str] = []
    for item in (output.get("results") or output.get("top_channels") or output.get("findings") or []):
        domains.extend(_extract_from_item(item, "domains"))
        url = item.get("url") or item.get("domain") or item.get("source_url")
        if url:
            try:
                from urllib.parse import urlparse
                host = urlparse(url).hostname
                if host and "." in host:
                    domains.append(host)
            except Exception:
                pass
    return list(dict.fromkeys(domains))


def _collect_wallets(output: dict) -> list[str]:
    wallets: list[str] = []
    for item in (output.get("results") or output.get("top_channels") or output.get("findings") or []):
        wallets.extend(_extract_from_item(item, "wallets"))
        wallets.extend(_extract_from_item(item, "wallet_addresses"))
    return list(dict.fromkeys(wallets))


def _extract_from_item(item: Any, field: str) -> list[str]:
    val = None
    if isinstance(item, dict):
        val = item.get(field) or (item.get("entities") or {}).get(field)
    if isinstance(val, list):
        return [str(v) for v in val if v]
    return []


async def _enrich_phones(phones: list[str]) -> list[dict]:
    if not phones:
        return []
    try:
        from app.modules.shared.scrapers.phone_intel import enrich_phones
        return enrich_phones(phones[:20])
    except Exception as exc:
        logger.warning(f"Phone enrichment failed: {exc}")
        return []


async def _enrich_domains(domains: list[str]) -> list[dict]:
    if not domains:
        return []
    try:
        from app.modules.shared.scrapers.domain_intel import enrich_domains
        return await enrich_domains(domains[:10])
    except Exception as exc:
        logger.warning(f"Domain enrichment failed: {exc}")
        return []


async def _enrich_wallets(wallets: list[str]) -> list[dict]:
    if not wallets:
        return []
    results = []
    try:
        from app.modules.shared.blockchain.tron_client import tron_client
        from app.modules.shared.blockchain.eth_client import eth_client

        for addr in wallets[:5]:
            if addr.startswith("T") and len(addr) == 34:
                data = await tron_client.get_transaction_history_volume(addr, days=30)
                results.append({
                    "address": addr, "chain": "TRON",
                    "inflow_usdt": round(data.get("inflow", 0), 2),
                    "outflow_usdt": round(data.get("outflow", 0), 2),
                    "tx_count_30d": data.get("tx_count", 0),
                    "risk_score": _wallet_risk(data),
                    "entity_type": "wallet",
                })
            elif addr.startswith("0x") and len(addr) == 42:
                txs = await eth_client.get_transactions(addr, limit=20)
                results.append({
                    "address": addr, "chain": "Ethereum",
                    "tx_count_recent": len(txs),
                    "risk_score": min(30 + len(txs) * 2, 90),
                    "entity_type": "wallet",
                })
    except Exception as exc:
        logger.warning(f"Wallet enrichment failed: {exc}")
    return results


def _wallet_risk(data: dict) -> int:
    outflow = data.get("outflow", 0)
    tx_count = data.get("tx_count", 0)
    risk = 10
    if outflow > 100_000:
        risk += 40
    elif outflow > 10_000:
        risk += 20
    if tx_count > 100:
        risk += 20
    elif tx_count > 20:
        risk += 10
    return min(risk, 95)


async def run_enrichment(module_output: dict) -> dict:
    """
    Augment module output dict in-place with phone, domain, and wallet intelligence.
    Returns the same dict with an added `enrichment` key.
    """
    phones = _collect_phones(module_output)
    domains = _collect_domains(module_output)
    wallets = _collect_wallets(module_output)

    phone_intel, domain_intel, wallet_intel = await asyncio.gather(
        _enrich_phones(phones),
        _enrich_domains(domains),
        _enrich_wallets(wallets),
    )

    module_output["enrichment"] = {
        "phones": phone_intel,
        "domains": domain_intel,
        "wallets": wallet_intel,
        "entity_counts": {
            "phones": len(phone_intel),
            "domains": len(domain_intel),
            "wallets": len(wallet_intel),
        },
    }

    logger.info(
        f"Live enrichment complete — phones:{len(phone_intel)} "
        f"domains:{len(domain_intel)} wallets:{len(wallet_intel)}"
    )
    return module_output
