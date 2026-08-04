from app.modules.shadowbet.config import PLATFORM_SIGNAL_WEIGHTS


def safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except Exception:
        return default


def safe_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return []


class PlatformScorer:
    def score(self, scraped_data: dict, license_result: dict) -> dict:
        scraped_data = scraped_data or {}
        license_result = license_result or {}

        license_score = 0.0 if license_result.get("is_licensed") else 100.0

        domains = safe_list(scraped_data.get("domains_found"))
        domain_score = min(len(domains) * 15, 100.0)

        payment_methods = safe_list(scraped_data.get("payment_methods"))

        mobile_balance = "Mobile Balance" in payment_methods
        crypto = any(
            m in payment_methods
            for m in ["USDT", "Bitcoin", "Cryptocurrency"]
        )

        payment_score = min(
            (60 if mobile_balance else 0) + (40 if crypto else 0),
            100.0,
        )

        member_count = safe_float(scraped_data.get("member_count"), 0.0)
        gambling_posts = safe_float(scraped_data.get("gambling_post_count"), 0.0)

        influencer_score = min(
            (member_count / 1000) * 5 + gambling_posts * 2,
            100.0,
        )

        weights = PLATFORM_SIGNAL_WEIGHTS

        final_score = round(
            min(
                license_score * weights["license_check"]
                + domain_score * weights["domain_clustering"]
                + payment_score * weights["payment_methods"]
                + influencer_score * weights["influencer_reach"],
                100,
            ),
            1,
        )

        return {
            "risk_score": final_score,
            "risk_level": self._level(final_score),
            "is_licensed": license_result.get("is_licensed", False),
            "license_details": license_result,
            "payment_methods": payment_methods,
            "wallet_addresses": safe_list(scraped_data.get("wallet_addresses")),
            "affiliated_domains": domains,
            "influencer_count": 0,
            "total_reach": int(member_count),
            "alert_fired": final_score >= 40,
        }

    def _level(self, score: float) -> str:
        if score >= 85:
            return "critical"
        if score >= 70:
            return "high"
        if score >= 50:
            return "medium"
        return "low"


platform_scorer = PlatformScorer()