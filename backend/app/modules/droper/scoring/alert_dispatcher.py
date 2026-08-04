import logging

logger = logging.getLogger(__name__)


async def dispatch_droper_alert(channel_name: str, risk_score: float, community_id: int, details: dict, db=None):
    if not db:
        logger.warning("No DB session — DROPER alert not persisted")
        return
    from app.services.alert_service import AlertService
    from app.services.entity_service import EntityService
    await AlertService(db).create_alert(
        module_id="droper", title=f"Drop Card Recruitment Network Detected: {channel_name}",
        description=f"Channel '{channel_name}' risk score {risk_score}/100. Community {community_id}.",
        severity="high" if risk_score >= 80 else "medium",
        risk_score=int(risk_score), entity_type="telegram_channel", entity_value=channel_name,
        metadata=details,
    )
    await EntityService(db).upsert_entity(
        entity_type="telegram_channel", entity_value=channel_name, source_module="droper",
        risk_score=int(risk_score), tags=["drop_card_recruitment", f"community_{community_id}"],
    )
    logger.info(f"DROPER alert dispatched for channel: {channel_name}")
