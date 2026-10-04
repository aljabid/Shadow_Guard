from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.shadowbet.module import ShadowBetModule
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


def get_platform_name(platform: dict) -> str:
    return (
        platform.get("platform_name")
        or platform.get("name")
        or platform.get("title")
        or platform.get("channel")
        or "unknown_platform"
    )


def get_operator_name(operator: dict) -> str:
    return (
        operator.get("operator_id")
        or operator.get("name")
        or operator.get("title")
        or "unknown_operator"
    )


def build_platform_alert_title(platform: dict, risk_score: int) -> str:
    name = get_platform_name(platform)
    category = platform.get("betting_category") or "ILLEGAL_BETTING_PLATFORM"
    category_label = str(category).replace("_", " ")

    if risk_score >= 85:
        prefix = "CRITICAL"
    elif risk_score >= 70:
        prefix = "HIGH"
    elif risk_score >= 40:
        prefix = "MEDIUM"
    else:
        prefix = "LOW"

    return f"{prefix} {category_label} — {name}"


def build_operator_alert_title(operator: dict, risk_score: int) -> str:
    name = get_operator_name(operator)

    if risk_score >= 85:
        prefix = "CRITICAL"
    elif risk_score >= 70:
        prefix = "HIGH"
    elif risk_score >= 40:
        prefix = "MEDIUM"
    else:
        prefix = "LOW"

    return f"{prefix} OPERATOR NETWORK — {name}"


def build_platform_description(platform: dict, risk_score: int) -> str:
    name = get_platform_name(platform)
    licensed = bool(platform.get("is_licensed", False))
    channel = platform.get("channel") or "unknown channel"
    priority = platform.get("evidence_priority") or "medium"

    domains = (
        platform.get("affiliated_domains")
        or platform.get("domains_found")
        or []
    )

    payments = platform.get("payment_methods") or []

    parts = [
        f"{name} flagged by SHADOW BET as suspicious gambling platform.",
        f"Risk score: {risk_score}/100.",
        f"Promotion source: {channel}.",
        "License status: licensed." if licensed else "License status: not verified / not licensed.",
    ]

    if domains:
        parts.append(f"Domains: {', '.join(map(str, domains[:5]))}.")

    if payments:
        parts.append(f"Payment methods: {', '.join(map(str, payments[:5]))}.")

    parts.append(f"Evidence priority: {str(priority).upper()}.")

    return " ".join(parts)


def build_operator_description(operator: dict, risk_score: int) -> str:
    name = get_operator_name(operator)

    domain_count = safe_int(operator.get("domain_count"), 0)
    influencer_count = safe_int(operator.get("influencer_count"), 0)
    revenue = safe_int(operator.get("estimated_weekly_revenue_kzt"), 0)

    return (
        f"{name} flagged as illegal betting operator infrastructure. "
        f"Threat score: {risk_score}/100. "
        f"Linked domains: {domain_count}. "
        f"Influencers mapped: {influencer_count}. "
        f"Estimated weekly revenue: {revenue:,} KZT."
    )


@celery_app.task(name="app.modules.shadowbet.tasks.run_analysis", bind=True)
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

            module = ShadowBetModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "shadowbet"
            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("SHADOWBET collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            for index, platform in enumerate(output.get("results", [])):
                risk_score = safe_int(platform.get("risk_score"), 0)

                if risk_score >= 40:
                    platform_name = get_platform_name(platform)

                    metadata = {
                        **platform,
                        "module_id": "shadowbet",
                        "finding_index": index,
                        "finding_type": "platform",
                    }

                    await alert_service.create_alert(
                        module_id="shadowbet",
                        title=build_platform_alert_title(platform, risk_score),
                        description=build_platform_description(platform, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type="gambling_platform",
                        entity_value=platform_name,
                        is_cross_module=False,
                        metadata=metadata,
                    )

            for index, operator in enumerate(output.get("operator_networks", [])):
                risk_score = safe_int(
                    operator.get("threat_score")
                    or operator.get("risk_score")
                    or 0
                )

                if risk_score >= 40:
                    operator_name = get_operator_name(operator)

                    metadata = {
                        **operator,
                        "module_id": "shadowbet",
                        "finding_index": index,
                        "finding_type": "operator_network",
                    }

                    await alert_service.create_alert(
                        module_id="shadowbet",
                        title=build_operator_alert_title(operator, risk_score),
                        description=build_operator_description(operator, risk_score),
                        severity=normalize_severity(risk_score),
                        risk_score=risk_score,
                        entity_type="operator_network",
                        entity_value=operator_name,
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
            logger.error(f"SHADOWBET task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.shadowbet.tasks.periodic_platform_scan")
def periodic_platform_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = ShadowBetModule()
    result = run_periodic_module_sync(
        module_id="shadowbet",
        execute_fn=module.execute,
        input_data={"demo_mode": False},
        task_id="periodic",
    )
    logger.info(f"Periodic SHADOWBET scan: {result.get('alerts_fired', 0)} alerts fired")
    return result