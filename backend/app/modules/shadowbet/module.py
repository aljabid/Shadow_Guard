from app.modules.base import BaseModule
from app.modules.shadowbet.schemas import ShadowBetScanInput
from app.modules.shadowbet.scrapers.telegram_scraper import shadowbet_telegram_scraper
from app.modules.shadowbet.scrapers.channel_searcher import shadowbet_channel_searcher
from app.modules.shadowbet.validation.aifc_license_checker import aifc_license_checker
from app.modules.shadowbet.clustering.domain_clusterer import domain_clusterer
from app.modules.shadowbet.clustering.operator_resolver import operator_resolver
from app.modules.shadowbet.influencer.network_builder import influencer_network_builder
from app.modules.shadowbet.scoring.platform_scorer import platform_scorer
from app.modules.shadowbet.scoring.operator_scorer import operator_scorer
from app.modules.shadowbet.config import GAMBLING_SEED_CHANNELS
from app.services.sources.source_normalizer import normalize_source

from datetime import datetime
import time
import logging

logger = logging.getLogger(__name__)


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def build_telegram_url(channel_name: str) -> str:
    value = str(channel_name or "").strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    if value.startswith("@"):
        value = value[1:]
    return f"https://t.me/{value}"


def build_domain_url(domain: str) -> str:
    value = str(domain or "").strip()
    if not value:
        return ""
    if value.startswith("http://") or value.startswith("https://"):
        return value
    return f"https://{value}"


def unique_list(items) -> list:
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


def classify_platform(result: dict) -> str:
    text = str(result).lower()
    licensed = bool(result.get("is_licensed", False))
    domains = result.get("affiliated_domains") or result.get("domains_found") or []
    payments = result.get("payment_methods") or []
    influencers = safe_int(result.get("influencer_count"), 0)

    if not licensed and payments:
        return "UNLICENSED_BETTING_PAYMENT_FLOW"

    if not licensed and domains:
        return "UNLICENSED_BETTING_PLATFORM"

    if influencers > 0 or "promo" in text or "промо" in text:
        return "INFLUENCER_PROMOTED_GAMBLING"

    if domains:
        return "BETTING_DOMAIN_INFRASTRUCTURE"

    return "SUSPICIOUS_GAMBLING_CONTENT"


def evidence_priority(risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def build_red_flags(result: dict) -> list[str]:
    flags = []

    if not result.get("is_licensed", False):
        flags.append("Platform is not licensed or license could not be verified.")

    domains = result.get("affiliated_domains") or result.get("domains_found") or []
    if domains:
        flags.append(f"Detected betting domains: {', '.join(map(str, domains[:5]))}.")

    payments = result.get("payment_methods") or []
    if payments:
        flags.append(f"Payment methods detected: {', '.join(map(str, payments[:5]))}.")

    wallets = result.get("wallet_addresses") or []
    if wallets:
        flags.append(f"Crypto wallet indicators detected: {len(wallets)} wallet(s).")

    affiliates = result.get("affiliate_codes") or []
    if affiliates:
        flags.append(f"Affiliate or promo codes detected: {', '.join(map(str, affiliates[:5]))}.")

    if not flags:
        flags.append("Flagged by gambling-platform scoring indicators.")

    return flags


def build_analyst_summary(result: dict, category: str) -> str:
    platform = result.get("platform_name") or "Unknown betting platform"
    channel = result.get("channel") or "unknown channel"
    risk = safe_int(result.get("risk_score"), 0)
    licensed = bool(result.get("is_licensed", False))
    domains = result.get("affiliated_domains") or result.get("domains_found") or []
    payments = result.get("payment_methods") or []

    summary = (
        f"{platform} was classified as {category.replace('_', ' ').title()}. "
        f"Current ShadowBet risk score is {risk}/100. "
        f"Detected promotion source: {channel}. "
    )

    summary += "License status: licensed. " if licensed else "License status: not verified / not licensed. "

    if domains:
        summary += f"Detected domains: {', '.join(map(str, domains[:5]))}. "

    if payments:
        summary += f"Payment methods: {', '.join(map(str, payments[:5]))}. "

    return summary.strip()


def build_recommended_actions(result: dict, category: str) -> list[str]:
    risk = safe_int(result.get("risk_score"), 0)

    if risk >= 85:
        actions = ["Escalate immediately for AFM analyst review."]
    elif risk >= 70:
        actions = ["Queue as high-priority illegal betting investigation."]
    elif risk >= 40:
        actions = ["Verify license status and continue monitoring."]
    else:
        actions = ["Keep as low-priority gambling OSINT context."]

    actions.extend(
        [
            "Preserve Telegram channel, betting domains, and promotional evidence.",
            "Check platform license status against official financial and gambling registries.",
            "Map payment methods, wallets, affiliate codes, and operator infrastructure.",
        ]
    )

    if category == "UNLICENSED_BETTING_PAYMENT_FLOW":
        actions.append("Escalate payment methods for blocking and financial-flow review.")

    if category == "INFLUENCER_PROMOTED_GAMBLING":
        actions.append("Map influencer accounts and estimate audience exposure.")

    return actions


def enrich_platform_result(platform_result: dict, channel_name: str) -> dict:
    telegram_url = build_telegram_url(channel_name)

    domains = unique_list(
        platform_result.get("affiliated_domains")
        or platform_result.get("domains_found")
        or []
    )

    domain_urls = [build_domain_url(d) for d in domains if d]

    evidence_urls = unique_list(
        [
            telegram_url,
            *domain_urls,
            *(platform_result.get("evidence_urls") or []),
        ]
    )

    source_url = telegram_url or (domain_urls[0] if domain_urls else "")
    risk_score = safe_int(platform_result.get("risk_score"), 0)
    category = classify_platform(platform_result)

    source_data = normalize_source(
        source_type="gambling_platform_intelligence",
        source_name=platform_result.get("platform_name") or channel_name,
        source_url=source_url,
        evidence_urls=evidence_urls,
        telegram_links=[telegram_url] if telegram_url else [],
        web_links=domain_urls,
        wallets=platform_result.get("wallet_addresses", []),
        raw_excerpt=str(platform_result)[:2000],
        metadata={
            "channel": channel_name,
            "platform_name": platform_result.get("platform_name"),
            "risk_score": risk_score,
            "is_licensed": platform_result.get("is_licensed"),
            "payment_methods": platform_result.get("payment_methods", []),
            "domains": domains,
            "betting_category": category,
        },
    )

    enriched = {
        **platform_result,
        "source_url": source_url,
        "evidence_urls": evidence_urls,
        "source_data": source_data,
        "risk_score": risk_score,
        "betting_category": category,
        "crime_category": "ILLEGAL_GAMBLING",
        "evidence_priority": evidence_priority(risk_score),
        "red_flags": build_red_flags(platform_result),
        "analyst_summary": build_analyst_summary(platform_result, category),
        "recommended_actions": build_recommended_actions(platform_result, category),
    }

    try:
        from app.ml.enrichment import classify_for_finding
        ml_text = " ".join(filter(None, [
            enriched.get("analyst_summary", ""),
            enriched.get("platform_name", ""),
            " ".join(str(f) for f in (enriched.get("red_flags") or [])),
        ]))
        enriched["ml_classification"] = classify_for_finding(ml_text)
    except Exception:
        enriched["ml_classification"] = {"enabled": False, "reason": "model_not_available"}

    return enriched


def enrich_operator_result(op: dict) -> dict:
    threat_score = safe_int(op.get("threat_score"), 0)

    domains = unique_list(
        op.get("domains")
        or op.get("affiliated_domains")
        or op.get("cluster_domains")
        or []
    )

    domain_urls = [build_domain_url(d) for d in domains if d]

    op["source_url"] = domain_urls[0] if domain_urls else ""
    op["evidence_urls"] = domain_urls
    op["risk_score"] = threat_score
    op["crime_category"] = "ILLEGAL_GAMBLING_OPERATOR_NETWORK"
    op["betting_category"] = "OPERATOR_INFRASTRUCTURE_CLUSTER"
    op["evidence_priority"] = evidence_priority(threat_score)

    op["analyst_summary"] = (
        f"Operator network {op.get('operator_id', 'unknown')} was identified as an "
        f"operator infrastructure cluster. Threat score is {threat_score}/100. "
        f"Detected {len(domains)} linked domain(s), "
        f"{safe_int(op.get('influencer_count'), 0)} influencer(s), and estimated weekly revenue "
        f"{safe_int(op.get('estimated_weekly_revenue_kzt'), 0):,} KZT."
    )

    op["red_flags"] = [
        f"Linked domains: {len(domains)}.",
        f"Influencers mapped: {safe_int(op.get('influencer_count'), 0)}.",
        f"Estimated weekly revenue: {safe_int(op.get('estimated_weekly_revenue_kzt'), 0):,} KZT.",
    ]

    op["recommended_actions"] = [
        "Cluster linked domains and check hosting/payment infrastructure.",
        "Preserve domain evidence and operator metadata.",
        "Correlate operator infrastructure with Telegram promotion channels.",
    ]

    op["source_data"] = normalize_source(
        source_type="operator_network",
        source_name=op.get("operator_id") or "operator_network",
        source_url=op["source_url"],
        evidence_urls=domain_urls,
        web_links=domain_urls,
        wallets=op.get("wallet_addresses", []),
        raw_excerpt=str(op)[:2000],
        metadata={
            "operator_id": op.get("operator_id"),
            "domain_count": op.get("domain_count"),
            "threat_score": threat_score,
        },
    )

    return op


class ShadowBetModule(BaseModule):
    module_id = "shadowbet"
    module_name = "ŞADOW BET"
    module_version = "1.1.0"
    module_description = (
        "Illegal gambling financial flow tracker. Maps unlicensed betting "
        "platforms, influencer promotion networks, and shared operator "
        "infrastructure across Kazakh and Russian social platforms."
    )

    def validate_input(self, data: dict) -> bool:
        try:
            ShadowBetScanInput(**data)
            return True
        except Exception as e:
            logger.warning(f"SHADOWBET validation failed: {e}")
            return False

    async def execute(self, data: dict, task_id: str) -> dict:
        start = time.time()
        inp = ShadowBetScanInput(**data)

        seeds = inp.seed_channels or GAMBLING_SEED_CHANNELS

        discovered = await shadowbet_channel_searcher.discover(
            seeds,
            inp.max_channels,
        )

        all_platform_data = []
        all_domains = []
        all_wallets = []
        influencer_map = {}

        for channel in discovered:
            channel_name = channel.get("username") or channel.get("title", "")

            if not channel_name:
                continue

            scraped = await shadowbet_telegram_scraper.scrape_and_analyze(
                channel_name
            )

            if not scraped.get("has_gambling_content"):
                continue

            all_domains.extend(scraped.get("domains_found", []))
            all_wallets.extend(scraped.get("wallet_addresses", []))

            for platform in scraped.get("platforms_mentioned", []):
                license_result = await aifc_license_checker.check(platform)

                score_result = platform_scorer.score(
                    scraped_data=scraped,
                    license_result=license_result,
                )

                platform_result = {
                    "platform_name": platform,
                    "channel": channel_name,
                    "member_count": channel.get("participants_count", 0),
                    **scraped,
                    **score_result,
                    "license_details": license_result,
                }

                all_platform_data.append(
                    enrich_platform_result(platform_result, channel_name)
                )

            if inp.include_influencer_map:
                influencer_map[channel_name] = {
                    "member_count": channel.get("participants_count", 0),
                    "platforms": scraped.get("platforms_mentioned", []),
                    "affiliate_codes": scraped.get("affiliate_codes", []),
                    "source_url": build_telegram_url(channel_name),
                }

        clusters = await domain_clusterer.cluster(list(set(all_domains)))

        operators = operator_resolver.resolve(
            clusters=clusters,
            wallet_addresses=list(set(all_wallets)),
            influencer_map=influencer_map,
        )

        scored_operators = [
            enrich_operator_result(operator_scorer.score(op)) for op in operators
        ]

        influencer_graph = {}

        if inp.include_influencer_map:
            influencer_graph = influencer_network_builder.build(
                influencer_map,
                all_platform_data,
            )

        duration = time.time() - start

        alerts_fired = sum(
            1 for p in all_platform_data if safe_int(p.get("risk_score"), 0) >= 40
        )

        category_counts = {}
        for item in all_platform_data:
            category = item.get("betting_category", "SUSPICIOUS_GAMBLING_CONTENT")
            category_counts[category] = category_counts.get(category, 0) + 1

        return {
            "task_id": task_id,
            "mode": "demo" if inp.demo_mode else "live",
            "channels_scanned": len(discovered),
            "illegal_platforms_found": len(all_platform_data),
            "operator_networks_found": len(scored_operators),
            "total_influencers_mapped": len(influencer_map),
            "total_audience_reach": sum(
                v.get("member_count", 0) for v in influencer_map.values()
            ),
            "results": all_platform_data,
            "operator_networks": scored_operators,
            "influencer_graph": influencer_graph,
            "alerts_fired": alerts_fired,
            "category_counts": category_counts,
            "scan_duration_seconds": round(duration, 2),
            "collector_status": {
                "telegram": {
                    "enabled": True,
                    "ready": len(all_platform_data) > 0,
                    "scanned": True,
                    "raw_count": len(discovered),
                    "error": None,
                },
                "open_web": {
                    "enabled": True,
                    "ready": len(all_domains) > 0,
                    "scanned": True,
                    "raw_count": len(all_domains),
                    "error": None,
                },
            },
        }

    def format_output(self, raw_result: dict) -> dict:
        raw_result["formatted_at"] = datetime.utcnow().isoformat()
        raw_result["module"] = self.module_id
        return raw_result