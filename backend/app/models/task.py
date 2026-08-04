from sqlalchemy import Column, String, Enum, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base


class TaskStatus(str, enum.Enum):
    queued = "queued"
    started = "started"
    success = "success"
    failure = "failure"
    revoked = "revoked"


class ModuleTask(Base):
    __tablename__ = "module_tasks"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    celery_task_id = Column(String(255), unique=True, nullable=True, index=True)
    module_id = Column(String(50), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    status = Column(Enum(TaskStatus), default=TaskStatus.queued, nullable=False)
    input_data = Column(JSON, nullable=True)
    result_data = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
