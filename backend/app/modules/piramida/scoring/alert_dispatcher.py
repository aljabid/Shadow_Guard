import logging

logger = logging.getLogger(__name__)


async def dispatch_piramida_alert(scheme_name: str, channel: str, risk_score: float,
                                  risk_level: str, estimated_victims: int,
                                  estimated_funds_kzt: float, db=None):
    if not db:
        logger.warning("No DB session — PIRAMIDA alert not persisted")
        return
    from app.services.alert_service import AlertService
    from app.services.entity_service import EntityService
    await AlertService(db).create_alert(
        module_id="piramida",
        title=f"Financial Pyramid Detected: {scheme_name}",
        description=(
            f"Scheme '{scheme_name}' on channel '{channel}' — risk score {risk_score}/100. "
            f"Estimated {estimated_victims:,} victims, {estimated_funds_kzt:,.0f} KZT at risk."
        ),
        severity="critical" if risk_score >= 85 else "high",
        risk_score=int(risk_score), entity_type="telegram_channel", entity_value=channel,
        metadata={"scheme_name": scheme_name, "estimated_victims": estimated_victims,
                  "estimated_funds_kzt": estimated_funds_kzt},
    )
    await EntityService(db).upsert_entity(
        entity_type="telegram_channel", entity_value=channel, source_module="piramida",
        risk_score=int(risk_score), tags=["financial_pyramid", risk_level],
    )
    logger.info(f"PIRAMIDA alert dispatched for: {scheme_name}")
