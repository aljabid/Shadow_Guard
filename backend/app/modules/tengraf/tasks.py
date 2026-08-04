from app.core.celery_app import celery_app
from app.core.database import AsyncSessionLocal
from app.models.task import ModuleTask, TaskStatus
from app.modules.tengraf.module import TengrafModule
from app.services.task_correlation import attach_cross_module_correlations

from datetime import datetime
from uuid import UUID
import asyncio
import logging

logger = logging.getLogger(__name__)


MIN_VISIBLE_RISK = 25
MIN_ALERT_RISK = 40
MAX_FINDINGS = 20


def safe_int(value, default: int = 0) -> int:
    try:
        if value is None:
            return default
        return int(float(value))
    except Exception:
        return default


def normalize_severity(risk_score: int, current: str | None = None) -> str:
    if current in ["low", "medium", "high", "critical"]:
        return current

    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def is_low_value_finding(finding: dict) -> bool:
    risk_score = safe_int(finding.get("risk_score"), 0)
    source_type = finding.get("source_type")
    title = (finding.get("title") or "").lower()
    text = (finding.get("text") or "").lower()
    combined = f"{title} {text}"

    entities = finding.get("entities") or {}
    wallets = entities.get("wallets") or []
    banks = entities.get("banks") or []
    phones = entities.get("phones") or []
    platforms = entities.get("platforms") or []
    telegram_handles = entities.get("telegram_handles") or []
    domains = entities.get("domains") or []

    has_financial_entity = bool(
        wallets or banks or phones or platforms
    )

    high_value_terms = [
        "kaspi",
        "halyk",
        "forte",
        "jusan",
        "bank logs",
        "logs",
        "fullz",
        "database",
        "db dump",
        "leak",
        "cashout",
        "obnal",
        "обнал",
        "дроп карта",
        "дроп карты",
        "drop card",
        "drop cards",
        "money mule",
        "wallet",
        "usdt",
        "trc20",
        "crypto",
        "1win",
        "mostbet",
        "betwinner",
        "illegal betting",
        "financial pyramid",
        "финансовая пирамида",
        "guaranteed profit",
        "гарантированный доход",
    ]

    has_high_value_term = any(term in combined for term in high_value_terms)

    # Always keep high-risk findings.
    if risk_score >= 70:
        return False

    # Keep medium findings only if they have real financial indicators.
    if risk_score >= MIN_VISIBLE_RISK and (
        has_financial_entity or has_high_value_term
    ):
        return False

    # Hide low-risk GitHub findings unless they contain financial crime indicators.
    if source_type == "github" and not has_high_value_term and not has_financial_entity:
        return True

    # Hide generic public-web regulator/reference pages unless they have strong indicators.
    if source_type == "public_web" and risk_score < 40:
        return True

    # Hide generic Telegram/gaming/drop noise unless tied to finance.
    gaming_noise = [
        "cs2",
        "steam",
        "skin",
        "skins",
        "knife",
        "karambit",
        "doppler",
        "case",
        "inventory",
        "awp",
        "glock",
        "team spirit",
        "vitality",
    ]

    gaming_hits = sum(1 for word in gaming_noise if word in combined)

    if gaming_hits >= 2 and not has_financial_entity and not has_high_value_term:
        return True

    # Hide anything below visible threshold.
    if risk_score < MIN_VISIBLE_RISK:
        return True

    # If the only thing extracted is a generic telegram/domain and risk is weak, hide it.
    if (
        risk_score < 40
        and not has_financial_entity
        and not has_high_value_term
        and (telegram_handles or domains)
    ):
        return True

    return False


def clean_and_rank_findings(output: dict) -> dict:
    findings = output.get("findings", []) or []

    cleaned = []
    for finding in findings:
        risk_score = safe_int(finding.get("risk_score"), 0)
        finding["risk_score"] = risk_score
        finding["risk_level"] = normalize_severity(
            risk_score, finding.get("risk_level")
        )
        finding["alert_fired"] = risk_score >= MIN_ALERT_RISK

        if not is_low_value_finding(finding):
            cleaned.append(finding)

    cleaned.sort(
        key=lambda f: (
            safe_int(f.get("risk_score"), 0),
            1 if (f.get("entities") or {}).get("wallets") else 0,
            1 if (f.get("entities") or {}).get("banks") else 0,
        ),
        reverse=True,
    )

    cleaned = cleaned[:MAX_FINDINGS]

    output["findings"] = cleaned
    output["high_risk_findings"] = [
        f for f in cleaned if safe_int(f.get("risk_score"), 0) >= 70
    ]
    output["alerts_fired"] = len(
        [f for f in cleaned if safe_int(f.get("risk_score"), 0) >= MIN_ALERT_RISK]
    )
    output["filtered_low_value_count"] = max(len(findings) - len(cleaned), 0)

    return output


@celery_app.task(name="app.modules.tengraf.tasks.run_analysis", bind=True)
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

            module = TengrafModule()
            output = await module.execute(input_data, task_id)

            output["module"] = "tengraf"
            output = clean_and_rank_findings(output)
            output = await attach_cross_module_correlations(db, output)

            from app.modules.shared.scrapers.live_enrichment import run_enrichment
            output = await run_enrichment(output)
            output["collector_status"] = collector_status.to_dict()
            logger.info("TENGRAF collectors: %s", collector_status.summary())

            alert_service = AlertService(db)

            for index, finding in enumerate(output.get("findings", [])):
                risk_score = safe_int(finding.get("risk_score"), 0)

                if risk_score >= MIN_ALERT_RISK:
                    severity = normalize_severity(
                        risk_score, finding.get("risk_level")
                    )

                    entity_value = (
                        finding.get("title")
                        or finding.get("source_url")
                        or finding.get("url")
                        or "tengraf_finding"
                    )

                    metadata = {
                        **finding,
                        "finding_index": index,
                        "module_id": "tengraf",
                    }

                    await alert_service.create_alert(
                        module_id="tengraf",
                        title="TENGRAF Intelligence Finding Detected",
                        description=(
                            f"{entity_value} flagged by TENGRAF "
                            f"OSINT/DarkNet intelligence."
                        ),
                        severity=severity,
                        risk_score=risk_score,
                        entity_type=finding.get("source_type", "osint_finding"),
                        entity_value=entity_value,
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
            logger.error(f"TENGRAF task failed: {e}")

            if task_record:
                task_record.status = TaskStatus.failure
                task_record.error_message = str(e)
                task_record.completed_at = datetime.utcnow()
                await db.commit()

            raise


@celery_app.task(name="app.modules.tengraf.tasks.periodic_darknet_scan")
def periodic_darknet_scan():
    from app.services.periodic_monitor import run_periodic_module_sync
    module = TengrafModule()

    result = run_periodic_module_sync(
        module_id="tengraf",
        execute_fn=module.execute,
        input_data={"demo_mode": False},
        task_id="periodic",
    )
    result = clean_and_rank_findings(result)
    logger.info(f"Periodic TENGRAF scan: {result.get('alerts_fired', 0)} alerts fired")
    return result