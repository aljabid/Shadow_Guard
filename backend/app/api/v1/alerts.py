from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.api.deps import get_current_user, require_analyst
from app.models.user import User
from app.services.alert_service import AlertService
from app.schemas.alert import AlertResponse, AlertDismissRequest

router = APIRouter(prefix="/alerts", tags=["alerts"])


def to_alert_response(alert) -> AlertResponse:
    return AlertResponse(
        id=str(alert.id),
        module_id=alert.module_id,
        title=alert.title,
        description=alert.description,
        severity=alert.severity.value
        if hasattr(alert.severity, "value")
        else str(alert.severity),
        risk_score=alert.risk_score,
        entity_type=alert.entity_type,
        entity_value=alert.entity_value,
        is_cross_module=alert.is_cross_module,
        is_dismissed=alert.is_dismissed,
        metadata=alert.meta_data,
        created_at=alert.created_at,
    )


@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    module_id: Optional[str] = None,
    severity: Optional[str] = None,
    dismissed: bool = False,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    alerts = await AlertService(db).get_alerts(
        module_id=module_id,
        severity=severity,
        dismissed=dismissed,
        limit=limit,
        offset=offset,
    )

    return [to_alert_response(alert) for alert in alerts]


@router.patch("/{alert_id}/dismiss", response_model=AlertResponse)
async def dismiss_alert(
    alert_id: str,
    request: AlertDismissRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    alert = await AlertService(db).dismiss_alert(
        alert_id=alert_id,
        user_id=str(current_user.id),
    )

    return to_alert_response(alert)


@router.patch("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    alert = await AlertService(db).dismiss_alert(
        alert_id=alert_id,
        user_id=str(current_user.id),
    )

    return to_alert_response(alert)


@router.patch("/module/{module_id}/resolve")
async def resolve_module_alerts(
    module_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    count = await AlertService(db).dismiss_module_alerts(
        module_id=module_id,
        user_id=str(current_user.id),
    )

    return {
        "message": "Module alerts resolved",
        "module_id": module_id,
        "resolved_count": count,
    }


@router.patch("/resolve-all")
async def resolve_all_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_analyst),
):
    count = await AlertService(db).dismiss_all_alerts(
        user_id=str(current_user.id),
    )

    return {
        "message": "All active alerts resolved",
        "resolved_count": count,
    }