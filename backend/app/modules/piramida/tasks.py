from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.piramida.module import PiramidaModule
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


def get_scheme_name(scheme: dict) -> str:
    return (
        scheme.get("name")
        or scheme.get("scheme_name")
        or scheme.get("title")
        or scheme.get("channel")
        or "unknown_scheme"
    )


def build_alert_title(scheme: dict, risk_score: int) -> str:
    scheme_name = get_scheme_name(scheme)

    category = (
        scheme.get("scheme_category")
        or scheme.get("crime_category")
        or "PYRAMID_SCHEME"
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

    return f"{prefix} {category_label} — {scheme_name}"


def build_alert_description(scheme: dict, risk_score: int) -> str:
    scheme_name = get_scheme_name(scheme)

    promised_return = scheme.get("promised_return_max")
    registered = scheme.get("is_registered", False)
    victims = safe_int(scheme.get("estimated_victims"), 0)
    funds = safe_int(scheme.get("estimated_funds_at_risk_kzt"), 0)
    priority = scheme.get("evidence_priority", "medium")

    parts = [
        f"{scheme_name} flagged by PIRAMIDA as suspicious investment/pyramid activity.",
        f"Risk score: {risk_score}/100.",
    ]

    if promised_return:
        parts.append(f"Promised return: {promised_return}%/month.")

    parts.append(
        "Registration status: registered."
        if registered
        else "Registration status: not verified / not registered."
    )

    if victims:
        parts.append(f"Estimated victims: {victims:,}.")

    if funds:
        parts.append(f"Estimated funds at risk: {funds:,} KZT.")

    parts.append(f"Evidence priority: {str(priority).upper()}.")

    return " ".join(parts)


@celery_app.task(name="app.modules.piramida.tasks.run_analysis", bind=True)
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

            module = PiramidaModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "piramida"
            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("PIRAMIDA collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            schemes = output.get("results") or output.get("schemes") or []

            for index, scheme in enumerate(schemes):
                risk_score = safe_int(
                    scheme.get("risk_score")
                    or scheme.get("score")
                    or scheme.get("final_score")
                    or 0
                )

                if risk_score >= 40:
                    scheme_name = get_scheme_name(scheme)

                    metadata = {
                        **scheme,
                        "module_id": "piramida",
                        "finding_index": index,
                    }

                    await alert_service.create_alert(
                        module_id="piramida",
                        title=build_alert_title(scheme, risk_score),
                        description=build_alert_description(scheme, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type="scheme",
                        entity_value=scheme_name,
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
            logger.error(f"PIRAMIDA task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.piramida.tasks.periodic_scheme_scan")
def periodic_scheme_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = PiramidaModule()
    result = run_periodic_module_sync(
        module_id="piramida",
        execute_fn=module.execute,
        input_data={"demo_mode": False},
        task_id="periodic",
    )
    logger.info(
        f"Periodic PIRAMIDA scan: {result.get('alerts_fired', 0)} alerts fired"
    )

    return result