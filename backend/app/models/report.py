from sqlalchemy import Column, String, DateTime, JSON, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class EvidenceReport(Base):
    __tablename__ = "evidence_reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    module_id = Column(String(50), nullable=False)
    task_id = Column(UUID(as_uuid=True), nullable=True)
    generated_by = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    file_path = Column(String(500), nullable=True)
    file_size_bytes = Column(String(50), nullable=True)
    report_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
