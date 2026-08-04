from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class AlertResponse(BaseModel):
    id: str
    module_id: str
    title: str
    description: Optional[str]
    severity: str
    risk_score: int
    entity_type: Optional[str]
    entity_value: Optional[str]
    is_cross_module: bool
    is_dismissed: bool
    metadata: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


class AlertDismissRequest(BaseModel):
    reason: Optional[str] = None
