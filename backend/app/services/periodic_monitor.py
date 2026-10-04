"""
Shared periodic monitoring utility.
Called by all 6 module periodic Celery beat tasks to:
  1. Run the module in live mode
  2. Persist high-risk findings as DB alerts
  3. Broadcast findings to all connected WebSocket clients immediately
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from app.core.database import AsyncSessionLocal
from app.services.alert_service import AlertService
from app.services.websocket_manager import websocket_manager

logger = logging.getLogger(__name__)

# Minimum risk score to trigger an alert and WebSocket push
ALERT_THRESHOLD = 40


def _normalize_severity(risk_score: int) -> str:
    if risk_score >= 85:
        return "critical"
    if risk_score >= 70:
        return "high"
    if risk_score >= 40:
        return "medium"
    return "low"


def _extract_findings(module_id: str, output: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Normalize the findings list across all module result shapes.
    KOLKHOZ returns `results`, others return `findings` or `top_channels`.
    """
    if module_id == "kolkhoz":
        return output.get("results") or []
    if module_id == "droper":
        return output.get("top_channels") or []
    return output.get("findings") or []


def _finding_title(module_id: str, finding: Dict) -> str:
    return (
        finding.get("title")
        or finding.get("exchange_name")
        or finding.get("name")
        or finding.get("username")
        or f"{module_id.upper()} periodic finding"
    )


def _finding_description(module_id: str, finding: Dict, risk_score: int) -> str:
    return (
        finding.get("analyst_summary")
        or finding.get("description")
        or f"{module_id.upper()} continuous scan detected risk score {risk_score}/100."
    )


def _finding_entity(finding: Dict) -> tuple:
    entity_type = (
        finding.get("source_type")
        or finding.get("entity_type")
        or "osint_finding"
    )
    entity_value = (
        finding.get("source_url")
        or finding.get("url")
        or finding.get("exchange_name")
        or finding.get("username")
        or finding.get("title")
        or "periodic_finding"
    )
    return entity_type, entity_value


async def run_periodic_module(
    module_id: str,
    execute_fn: Callable,
    input_data: Optional[Dict] = None,
    task_id: str = "periodic",
) -> Dict[str, Any]:
    """
    Execute a module and broadcast high-risk findings via WebSocket alert push.

    Parameters
    ----------
    module_id   : module identifier string
    execute_fn  : async callable — the module's execute() coroutine
    input_data  : parameters for the module (default: live mode, no demo)
    task_id     : task identifier for logging
    """
    input_data = input_data or {"demo_mode": False}
    output: Dict[str, Any] = {}

    try:
        output = await execute_fn(input_data, task_id)
    except Exception as e:
        logger.error(f"[{module_id}] Periodic execute failed: {e}")
        return {"module": module_id, "error": str(e), "alerts_fired": 0}

    findings = _extract_findings(module_id, output)
    high_risk = [
        f for f in findings
        if int(f.get("risk_score", 0)) >= ALERT_THRESHOLD
    ]

    if not high_risk:
        logger.info(
            f"[{module_id}] Periodic scan complete — {len(findings)} findings, "
            f"none above alert threshold."
        )
        return output

    try:
        async with AsyncSessionLocal() as db:
            alert_service = AlertService(db)
            alerts_created = 0

            for finding in high_risk[:10]:
                risk_score   = int(finding.get("risk_score", 0))
                severity     = _normalize_severity(risk_score)
                title        = _finding_title(module_id, finding)
                description  = _finding_description(module_id, finding, risk_score)
                entity_type, entity_value = _finding_entity(finding)

                try:
                    await alert_service.create_alert(
                        module_id=module_id,
                        title=f"[PERIODIC] {title}",
                        description=description,
                        severity=severity,
                        risk_score=risk_score,
                        entity_type=entity_type,
                        entity_value=str(entity_value)[:500],
                        is_cross_module=False,
                        metadata={
                            **{k: v for k, v in finding.items() if isinstance(v, (str, int, float, bool, type(None)))},
                            "module_id": module_id,
                            "periodic": True,
                            "scan_timestamp": datetime.utcnow().isoformat(),
                        },
                    )
                    alerts_created += 1
                except Exception as e:
                    logger.warning(f"[{module_id}] Alert create failed for '{title}': {e}")

            logger.info(
                f"[{module_id}] Periodic scan complete — {len(findings)} findings, "
                f"{alerts_created} alerts created and broadcast."
            )

    except Exception as e:
        logger.error(f"[{module_id}] DB/WebSocket alert dispatch failed: {e}")

    # Also push a summary event to WebSocket (non-alert clients listening for feed updates)
    try:
        await websocket_manager.broadcast({
            "type": "periodic_scan_complete",
            "module_id": module_id,
            "findings_count": len(findings),
            "high_risk_count": len(high_risk),
            "alerts_fired": len(high_risk),
            "timestamp": datetime.utcnow().isoformat(),
        })
    except Exception:
        pass

    return output


def run_periodic_module_sync(
    module_id: str,
    execute_fn: Callable,
    input_data: Optional[Dict] = None,
    task_id: str = "periodic",
) -> Dict[str, Any]:
    """Synchronous wrapper for use inside Celery tasks (which can't be async)."""
    return asyncio.run(
        run_periodic_module(module_id, execute_fn, input_data, task_id)
    )
