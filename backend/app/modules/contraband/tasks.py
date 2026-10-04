from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.contraband.module import ContrabandModule
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


def get_finding_title(finding: dict) -> str:
    return (
        finding.get("title")
        or finding.get("source_url")
        or finding.get("source_name")
        or "contraband_finding"
    )


def build_alert_title(finding: dict, risk_score: int) -> str:
    title = get_finding_title(finding)

    category = finding.get("crime_category") or "CONTRABAND_INTELLIGENCE"
    category_label = str(category).replace("_", " ")

    if risk_score >= 85:
        prefix = "CRITICAL"
    elif risk_score >= 70:
        prefix = "HIGH"
    elif risk_score >= 40:
        prefix = "MEDIUM"
    else:
        prefix = "LOW"

    return f"{prefix} {category_label} — {title}"


def build_alert_description(finding: dict, risk_score: int) -> str:
    title = get_finding_title(finding)

    category = finding.get("crime_category") or "CONTRABAND_INTELLIGENCE"
    source_type = finding.get("source_type") or "unknown_source"
    city = finding.get("city") or "unknown location"
    priority = finding.get("evidence_priority") or "medium"
    confidence = finding.get("confidence") or "Medium"

    entities = finding.get("entities") or {}
    telegrams = entities.get("telegram_handles") or []
    phones = entities.get("phones") or []
    wallets = entities.get("wallets") or []
    locations = entities.get("locations") or []

    parts = [
        f"{title} flagged by CONTRABAND-KZ.",
        f"Category: {str(category).replace('_', ' ')}.",
        f"Risk score: {risk_score}/100.",
        f"Source type: {source_type}.",
        f"Location: {city}.",
        f"Evidence priority: {str(priority).upper()}.",
        f"Confidence: {confidence}.",
    ]

    if telegrams:
        parts.append(f"Telegram indicators: {', '.join(map(str, telegrams[:3]))}.")

    if phones:
        parts.append(f"Phone indicators: {len(phones)} detected.")

    if wallets:
        parts.append(f"Wallet indicators: {len(wallets)} detected.")

    if locations:
        parts.append(f"Kazakhstan locations: {', '.join(map(str, locations[:3]))}.")

    red_flags = finding.get("red_flags") or []
    if red_flags:
        parts.append(f"Primary red flag: {red_flags[0]}")

    return " ".join(parts)


def get_entity_type(finding: dict) -> str:
    category = str(finding.get("crime_category") or "").lower()

    if "drug" in category:
        return "drug_contraband"

    if "vape" in category:
        return "vape_contraband"

    if "alcohol" in category:
        return "alcohol_contraband"

    if "courier" in category or "drop" in category:
        return "courier_network"

    return "contraband"


def get_entity_value(finding: dict) -> str:
    entities = finding.get("entities") or {}

    telegrams = entities.get("telegram_handles") or []
    phones = entities.get("phones") or []
    wallets = entities.get("wallets") or []

    if telegrams:
        return str(telegrams[0])

    if phones:
        return str(phones[0])

    if wallets:
        return str(wallets[0])

    return get_finding_title(finding)


@celery_app.task(name="app.modules.contraband.tasks.run_analysis", bind=True)
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

            module = ContrabandModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "contraband"
            output["module_id"] = "contraband"

            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("CONTRABAND collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            for index, finding in enumerate(output.get("findings", [])):
                risk_score = safe_int(finding.get("risk_score"), 0)

                if risk_score >= 40:
                    metadata = {
                        **finding,
                        "module_id": "contraband",
                        "finding_index": index,
                    }

                    await alert_service.create_alert(
                        module_id="contraband",
                        title=build_alert_title(finding, risk_score),
                        description=build_alert_description(finding, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type=get_entity_type(finding),
                        entity_value=get_entity_value(finding),
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
            logger.error(f"CONTRABAND-KZ task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.contraband.tasks.periodic_contraband_scan")
def periodic_contraband_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = ContrabandModule()
    result = run_periodic_module_sync(
        module_id="contraband",
        execute_fn=module.execute,
        input_data={
            "include_telegram":   True,
            "include_web":        True,
            "include_darknet":    True,
            "include_instagram":  True,
            "include_marketplace": True,
            "max_findings":       20,
            "demo_mode":          False,
        },
        task_id="periodic",
    )
    logger.info(f"Periodic CONTRABAND-KZ scan: {result.get('alerts_fired', 0)} alerts fired")
    return result