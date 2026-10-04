from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ModuleRunRequest(BaseModel):
    input_data: dict


class TaskStatusResponse(BaseModel):
    task_id: str
    module_id: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class ModuleMetaResponse(BaseModel):
    id: str
    name: str
    version: str
    description: str
    status: str = "active"
