from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ReportGenerateRequest(BaseModel):
    module_id: str
    task_id: str
    title: Optional[str] = None
    include_raw_data: bool = False


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    module_id: str
    title: str
    summary: Optional[str] = None
    file_path: Optional[str] = None
    created_at: datetime