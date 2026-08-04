from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from app.models.alert import Alert, AlertSeverity
from app.services.websocket_manager import websocket_manager


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _normalize_severity(self, severity: str) -> AlertSeverity:
        if severity not in ["low", "medium", "high", "critical"]:
            severity = "medium"

        return AlertSeverity(severity)

    def _serialize_alert(self, alert: Alert) -> dict:
        return {
            "id": str(alert.id),
            "module_id": alert.module_id,
            "title": alert.title,
            "description": alert.description,
            "severity": alert.severity.value
            if hasattr(alert.severity, "value")
            else str(alert.severity),
            "risk_score": alert.risk_score,
            "entity_type": alert.entity_type,
            "entity_value": alert.entity_value,
            "is_cross_module": alert.is_cross_module,
            "is_dismissed": alert.is_dismissed,
            "metadata": alert.meta_data,
            "created_at": alert.created_at.isoformat()
            if alert.created_at
            else datetime.utcnow().isoformat(),
        }

    async def create_alert(
        self,
        module_id: str,
        title: str,
        description: str,
        severity: str,
        risk_score: int,
        entity_type: Optional[str] = None,
        entity_value: Optional[str] = None,
        is_cross_module: bool = False,
        metadata: Optional[dict] = None,
    ) -> Alert:
        normalized_severity = self._normalize_severity(severity)
        risk_score = int(risk_score or 0)

        result = await self.db.execute(
            select(Alert).where(
                Alert.module_id == module_id,
                Alert.title == title,
                Alert.entity_value == entity_value,
                Alert.is_dismissed == False,
            )
        )

        existing_alert = result.scalars().first()

        if existing_alert:
            existing_alert.description = description
            existing_alert.severity = normalized_severity
            existing_alert.risk_score = max(existing_alert.risk_score or 0, risk_score)
            existing_alert.entity_type = entity_type
            existing_alert.entity_value = entity_value
            existing_alert.is_cross_module = is_cross_module
            existing_alert.meta_data = metadata or {}
            existing_alert.created_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(existing_alert)

            await self._broadcast_alert(existing_alert, event_type="updated_alert")

            return existing_alert

        alert = Alert(
            module_id=module_id,
            title=title,
            description=description,
            severity=normalized_severity,
            risk_score=risk_score,
            entity_type=entity_type,
            entity_value=entity_value,
            is_cross_module=is_cross_module,
            meta_data=metadata or {},
            created_at=datetime.utcnow(),
        )

        self.db.add(alert)
        await self.db.commit()
        await self.db.refresh(alert)

        await self._broadcast_alert(alert, event_type="new_alert")

        return alert

    async def _broadcast_alert(
        self,
        alert: Alert,
        event_type: str = "new_alert",
    ) -> None:
        try:
            await websocket_manager.broadcast(
                {
                    "type": event_type,
                    "alert": self._serialize_alert(alert),
                }
            )
        except Exception:
            pass

    async def get_alerts(
        self,
        module_id: Optional[str] = None,
        severity: Optional[str] = None,
        dismissed: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> List[Alert]:
        query = select(Alert).where(Alert.is_dismissed == dismissed)

        if module_id:
            query = query.where(Alert.module_id == module_id)

        if severity:
            query = query.where(Alert.severity == self._normalize_severity(severity))

        query = query.order_by(Alert.created_at.desc()).limit(limit).offset(offset)

        result = await self.db.execute(query)

        return result.scalars().all()

    async def dismiss_alert(self, alert_id: str, user_id: str) -> Alert:
        import uuid

        result = await self.db.execute(
            select(Alert).where(Alert.id == uuid.UUID(alert_id))
        )

        alert = result.scalar_one_or_none()

        if not alert:
            from app.core.exceptions import NotFoundError

            raise NotFoundError("Alert not found")

        alert.is_dismissed = True
        alert.dismissed_at = datetime.utcnow()
        alert.dismissed_by = uuid.UUID(user_id)

        await self.db.commit()
        await self.db.refresh(alert)

        return alert

    async def dismiss_module_alerts(
        self,
        module_id: str,
        user_id: str,
    ) -> int:
        import uuid

        result = await self.db.execute(
            select(Alert).where(
                Alert.module_id == module_id,
                Alert.is_dismissed == False,
            )
        )

        alerts = result.scalars().all()
        count = 0

        for alert in alerts:
            alert.is_dismissed = True
            alert.dismissed_at = datetime.utcnow()
            alert.dismissed_by = uuid.UUID(user_id)
            count += 1

        await self.db.commit()

        return count

    async def dismiss_all_alerts(
        self,
        user_id: str,
    ) -> int:
        import uuid

        result = await self.db.execute(
            select(Alert).where(Alert.is_dismissed == False)
        )

        alerts = result.scalars().all()
        count = 0

        for alert in alerts:
            alert.is_dismissed = True
            alert.dismissed_at = datetime.utcnow()
            alert.dismissed_by = uuid.UUID(user_id)
            count += 1

        await self.db.commit()

        return count