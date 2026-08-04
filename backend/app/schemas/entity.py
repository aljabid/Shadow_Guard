from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class EntityResponse(BaseModel):
    id: str
    entity_type: str
    entity_value: str
    source_modules: List[str]
    risk_score: int
    tags: List[str]
    metadata: Optional[dict]
    first_seen: datetime
    last_seen: Optional[datetime]
    occurrence_count: int

    class Config:
        from_attributes = True
