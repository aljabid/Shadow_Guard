from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.kolkhoz.module import KolkhozModule
from app.services.task_correlation import attach_cross_module_correlations

from datetime import datetime
from uuid import UUID
import asyncio
import logging

logger = logging.getLogger(__name__)


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def normalize_severity(risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def get_exchange_name(item: dict) -> str:
    return (
        item.get("exchange_name")
        or item.get("name")
        or item.get("title")
        or "unknown_exchange"
    )


def build_alert_title(item: dict, risk_score: int) -> str:
    exchange_name = get_exchange_name(item)

    category = (
        item.get("exchange_category")
        or item.get("crime_category")
        or "EXCHANGE_MONITORING"
    )

    category_label = str(category).replace("_", " ")

    if risk_score >= 85:
        prefix = "CRITICAL"
    elif risk_score >= 70:
        prefix = "HIGH"
    elif risk_score >= 40:
        prefix = "MEDIUM"
    else:
        prefix = "LOW"

    return f"{prefix} {category_label} — {exchange_name}"


def build_alert_description(item: dict, risk_score: int) -> str:
    exchange_name = get_exchange_name(item)

    health_status = item.get("health_status") or "UNKNOWN"
    collapse_probability = safe_int(item.get("collapse_probability"), 0)
    confidence = item.get("confidence") or "Medium"
    evidence_priority = item.get("evidence_priority") or "medium"

    parts = [
        f"{exchange_name} flagged by KOLKHOZ pre-collapse exchange intelligence.",
        f"Risk score: {risk_score}/100.",
        f"Health status: {health_status}.",
        f"Collapse probability: {collapse_probability}%.",
        f"Confidence: {confidence}.",
        f"Evidence priority: {str(evidence_priority).upper()}.",
    ]

    risk_drivers = item.get("risk_drivers") or []

    if risk_drivers:
        parts.append(f"Primary driver: {risk_drivers[0]}")

    return " ".join(parts)


@celery_app.task(name="app.modules.kolkhoz.tasks.run_analysis", bind=True)
def run_analysis(self, module_id: str, input_data: dict, task_id: str):
    return asyncio.run(
        _run_async(input_data, task_id)
    )


async def _run_async(input_data: dict, task_id: str):
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        from app.services.alert_service import AlertService
        from app.services.api_key_loader import api_key_loader
        await api_key_loader.refresh(db)

        task_uuid = UUID(task_id)

        result = await db.execute(
            select(ModuleTask).where(ModuleTask.id == task_uuid)
        )
        task_record = result.scalar_one_or_none()

        if task_record:
            task_record.status = TaskStatus.started
            task_record.started_at = datetime.utcnow()
            await db.commit()

        try:
            from app.services.collector_status import collector_status
            collector_status.reset()

            module = KolkhozModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "kolkhoz"
            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("KOLKHOZ collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            for index, item in enumerate(output.get("results", [])):
                risk_score = safe_int(item.get("risk_score"), 0)

                if item.get("alert_fired") or risk_score >= 40:
                    exchange_name = get_exchange_name(item)

                    metadata = {
                        **item,
                        "module_id": "kolkhoz",
                        "finding_index": index,
                    }

                    await alert_service.create_alert(
                        module_id="kolkhoz",
                        title=build_alert_title(item, risk_score),
                        description=build_alert_description(item, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type="exchange",
                        entity_value=exchange_name,
                        is_cross_module=False,
                        metadata=metadata,
                    )

            if task_record:
                task_record.status = TaskStatus.success
                task_record.result_data = output
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            return output

        except Exception as e:
            logger.error(f"KOLKHOZ task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.kolkhoz.tasks.periodic_exchange_scan")
def periodic_exchange_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = KolkhozModule()

    result = run_periodic_module_sync(
        module_id="kolkhoz",
        execute_fn=module.execute,
        input_data={"demo_mode": False, "playback_mode": False},
        task_id="periodic",
    )
    logger.info(f"Periodic KOLKHOZ scan: {result.get('alerts_fired', 0)} alerts fired")
    return result