from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.droper.module import DroperModule
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


def build_alert_title(channel: dict, risk_score: int) -> str:
    title = (
        channel.get("title")
        or channel.get("username")
        or channel.get("channel")
        or "Unknown channel"
    )

    category = channel.get("crime_category") or "DROPPER_NETWORK"
    category_label = category.replace("_", " ")

    if risk_score >= 85:
        prefix = "CRITICAL"
    elif risk_score >= 70:
        prefix = "HIGH"
    elif risk_score >= 40:
        prefix = "MEDIUM"
    else:
        prefix = "LOW"

    return f"{prefix} {category_label} — {title}"


def build_alert_description(channel: dict, risk_score: int) -> str:
    title = (
        channel.get("title")
        or channel.get("username")
        or channel.get("channel")
        or "Unknown channel"
    )

    members = safe_int(channel.get("member_count"), 0)
    posts = safe_int(channel.get("recruitment_post_count"), 0)
    role = channel.get("network_role") or "Recruitment Channel"
    priority = channel.get("evidence_priority") or "medium"

    return (
        f"{title} flagged by DROPER as {role}. "
        f"Risk score: {risk_score}/100. "
        f"Members: {members:,}. Recruitment posts: {posts}. "
        f"Evidence priority: {str(priority).upper()}."
    )


@celery_app.task(name="app.modules.droper.tasks.run_analysis", bind=True)
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

            module = DroperModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "droper"
            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("DROPER collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            for index, channel in enumerate(output.get("top_channels", [])):
                risk_score = safe_int(channel.get("risk_score"), 0)

                if risk_score >= 30:
                    channel_name = (
                        channel.get("username")
                        or channel.get("title")
                        or channel.get("channel")
                        or "unknown_channel"
                    )

                    metadata = {
                        **channel,
                        "module_id": "droper",
                        "finding_index": index,
                    }

                    await alert_service.create_alert(
                        module_id="droper",
                        title=build_alert_title(channel, risk_score),
                        description=build_alert_description(channel, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type="telegram_channel",
                        entity_value=channel_name,
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
            logger.error(f"DROPER task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.droper.tasks.periodic_channel_scan")
def periodic_channel_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = DroperModule()
    result = run_periodic_module_sync(
        module_id="droper",
        execute_fn=module.execute,
        input_data={"demo_mode": False},
        task_id="periodic",
    )
    logger.info(f"Periodic DROPER scan: {result.get('alerts_fired', 0)} alerts fired")
    return result