import logging

logger = logging.getLogger(__name__)


async def dispatch_shadowbet_alert(platform_name: str, risk_score: float,
                                   risk_level: str, details: dict, db=None):
    if not db:
        logger.warning("No DB session — SHADOWBET alert not persisted")
        return
    from app.services.alert_service import AlertService
    from app.services.entity_service import EntityService
    await AlertService(db).create_alert(
        module_id="shadowbet",
        title=f"Illegal Gambling Platform Detected: {platform_name}",
        description=(
            f"Platform '{platform_name}' — risk score {risk_score}/100. "
            f"No valid AIFC/BAC license found."
        ),
        severity="critical" if risk_score >= 85 else "high",
        risk_score=int(risk_score), entity_type="betting_platform", entity_value=platform_name,
        metadata=details,
    )
    await EntityService(db).upsert_entity(
        entity_type="betting_platform", entity_value=platform_name,
        source_module="shadowbet", risk_score=int(risk_score),
        tags=["illegal_gambling", risk_level],
    )
    logger.info(f"SHADOWBET alert dispatched for: {platform_name}")
