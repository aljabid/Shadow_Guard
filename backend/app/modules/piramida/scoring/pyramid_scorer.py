from app.modules.piramida.scoring.components import return_score, registration_score, blockchain_score, referral_score, velocity_score
from app.modules.piramida.validation.license_validator import validate_entity
from app.modules.piramida.blockchain.inflow_analyzer import analyze_inflow_pattern
from app.modules.piramida.config import PYRAMID_SIGNAL_WEIGHTS
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def get_risk_level(score: float) -> str:
    if score >= 85:
        return "critical"
    if score >= 70:
        return "high"
    if score >= 50:
        return "medium"
    return "low"


class PyramidScorer:
    async def score(self, scraped_data: dict) -> dict:
        channel = scraped_data.get("channel", "unknown")
        r_score = return_score.score(scraped_data.get("max_monthly_return"))
        entity_name = scraped_data.get("scheme_name", channel)
        try:
            validity = await validate_entity(entity_name)
            reg_score = registration_score.score(validity.get("validity_score", 0))
            registration_details = validity
            is_registered = validity.get("is_valid", False)
        except Exception as e:
            logger.error(f"Registry check failed: {e}")
            reg_score = 50.0
            registration_details = {"error": str(e)}
            is_registered = False
        wallets = scraped_data.get("wallet_addresses", [])
        try:
            inflow_data = await analyze_inflow_pattern(wallets)
            b_score = blockchain_score.score(inflow_data)
        except Exception as e:
            logger.error(f"Blockchain analysis failed: {e}")
            b_score = 0.0
            inflow_data = {}
        referral_data = scraped_data.get("referral_analysis", {})
        ref_score = referral_score.score(referral_data)
        weekly_growth = scraped_data.get("weekly_growth_estimate", 0)
        member_count = scraped_data.get("member_count", 0)
        vel_score = velocity_score.score(weekly_growth, member_count)
        weights = PYRAMID_SIGNAL_WEIGHTS
        final_score = round(min(
            r_score * weights["return_promise"]
            + reg_score * weights["registration_validity"]
            + b_score * weights["blockchain_activity"]
            + ref_score * weights["referral_structure"]
            + vel_score * weights["recruitment_velocity"],
            100,
        ), 1)
        returns = scraped_data.get("return_promises", [])
        monthly_returns = [r["monthly_equivalent"] for r in returns]
        components = [
            {"name": k, "score": s, "weight": weights[k], "weighted_score": round(s * weights[k], 1)}
            for k, s in [
                ("return_promise", r_score), ("registration_validity", reg_score),
                ("blockchain_activity", b_score), ("referral_structure", ref_score),
                ("recruitment_velocity", vel_score),
            ]
        ]
        return {
            "scheme_name": entity_name, "channel": channel,
            "risk_score": final_score, "risk_level": get_risk_level(final_score),
            "score_components": components,
            "promised_return_min": min(monthly_returns) if monthly_returns else None,
            "promised_return_max": max(monthly_returns) if monthly_returns else None,
            "return_period": "monthly", "is_registered": is_registered,
            "registration_details": registration_details, "wallet_addresses": wallets,
            "alert_fired": final_score >= 70, "timestamp": datetime.utcnow().isoformat(),
        }


pyramid_scorer = PyramidScorer()
