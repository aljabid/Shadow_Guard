from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    JSON,
    Text,
    Enum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

import uuid
import enum

from app.core.database import Base

class AlertSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class Alert(Base):
    __tablename__ = "alerts"

    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    module_id = Column(
        String(50),
        nullable=False,
        index=True,
    )

    title = Column(
        String(255),
        nullable=False,
    )

    description = Column(
        Text,
        nullable=True,
    )

    severity = Column(
        Enum(AlertSeverity),
        nullable=False,
        default=AlertSeverity.medium,
        index=True,
    )

    risk_score = Column(
        Integer,
        nullable=False,
        default=0,
        index=True,
    )

    entity_type = Column(
        String(100),
        nullable=True,
        index=True,
    )

    entity_value = Column(
        String(500),
        nullable=True,
        index=True,
    )

    is_cross_module = Column(
        Boolean,
        nullable=False,
        default=False,
    )

    is_dismissed = Column(
        Boolean,
        nullable=False,
        default=False,
        index=True,
    )

    meta_data = Column(
        "metadata",
        JSON,
        nullable=True,
        default=dict,
    )

    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    dismissed_at = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    dismissed_by = Column(
        UUID(as_uuid=True),
        nullable=True,
    )

