import logging

logger = logging.getLogger(__name__)


async def dispatch_kolkhoz_alert(exchange_name: str, risk_score: float, risk_level: str, signals: list, db=None):
    if not db:
        logger.warning("No DB session — alert not persisted")
        return
    from app.services.alert_service import AlertService
    from app.services.entity_service import EntityService
    alert_service = AlertService(db)
    entity_service = EntityService(db)
    await alert_service.create_alert(
        module_id="kolkhoz",
        title=f"Exchange Collapse Risk: {exchange_name}",
        description=f"Risk score {risk_score}/100 ({risk_level.upper()}). Pre-collapse signals detected.",
        severity="critical" if risk_score >= 85 else "high" if risk_score >= 65 else "medium",
        risk_score=int(risk_score),
        entity_type="exchange",
        entity_value=exchange_name,
        metadata={"signals": signals},
    )
    await entity_service.upsert_entity(
        entity_type="exchange", entity_value=exchange_name,
        source_module="kolkhoz", risk_score=int(risk_score),
        tags=["shadow_exchange", risk_level],
    )
    logger.info(f"KOLKHOZ alert dispatched for {exchange_name} (score: {risk_score})")
