from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from typing import Optional


class AuditService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(self, action: str, user_id: Optional[str] = None, username: Optional[str] = None,
                  resource_type: Optional[str] = None, resource_id: Optional[str] = None,
                  ip_address: Optional[str] = None, user_agent: Optional[str] = None,
                  request_data: Optional[dict] = None, response_status: Optional[str] = None) -> AuditLog:
        entry = AuditLog(user_id=user_id, username=username, action=action,
                         resource_type=resource_type, resource_id=resource_id,
                         ip_address=ip_address, user_agent=user_agent,
                         request_data=request_data, response_status=response_status)
        self.db.add(entry)
        await self.db.commit()
        return entry
