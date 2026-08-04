from sqlalchemy import Column, String, Enum, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum
from app.core.database import Base


class InvestigationStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    closed = "closed"
    archived = "archived"


class Investigation(Base):
    __tablename__ = "investigations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    module_ids = Column(JSON, nullable=True)
    status = Column(Enum(InvestigationStatus), default=InvestigationStatus.open, nullable=False)
    risk_level = Column(String(20), nullable=True)
    tags = Column(JSON, nullable=True)
    findings_snapshot = Column(JSON, nullable=True)
    linked_task_ids = Column(JSON, nullable=True)
    entity_summary = Column(JSON, nullable=True)
    created_by = Column(UUID(as_uuid=True), nullable=False)
    created_by_username = Column(String(100), nullable=True)
    assigned_to = Column(String(100), nullable=True)
    analyst_notes = Column(Text, nullable=True)
    evidence_package_path = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
