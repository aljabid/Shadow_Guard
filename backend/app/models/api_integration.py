from sqlalchemy import Column, String, Boolean, DateTime, JSON, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class ApiIntegration(Base):
    __tablename__ = "api_integrations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    integration_type = Column(String(50), nullable=False)
    display_name = Column(String(150), nullable=True)
    description = Column(Text, nullable=True)
    config = Column(JSON, nullable=True)
    is_enabled = Column(Boolean, default=False, nullable=False)
    status = Column(String(20), default="not_configured", nullable=False)
    last_tested = Column(DateTime(timezone=True), nullable=True)
    last_sync = Column(DateTime(timezone=True), nullable=True)
    health_score = Column(Integer, nullable=True)
    rate_limit_remaining = Column(Integer, nullable=True)
    usage_count = Column(Integer, default=0, nullable=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
