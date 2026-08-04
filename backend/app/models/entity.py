'''

from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class SharedEntity(Base):
    __tablename__ = "shared_entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_value = Column(String(500), nullable=False, index=True)
    source_modules = Column(ARRAY(String), default=[], nullable=False)
    risk_score = Column(Integer, default=0)
    tags = Column(ARRAY(String), default=[], nullable=False)
    meta_data = Column("metadata", JSON, nullable=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())
    occurrence_count = Column(Integer, default=1)
'''

from sqlalchemy import Column, String, DateTime, JSON, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from app.core.database import Base


class SharedEntity(Base):
    __tablename__ = "shared_entities"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_value = Column(String(500), nullable=False, index=True)
    source_modules = Column(JSON, default=list, nullable=False)
    risk_score = Column(Integer, default=0)
    tags = Column(JSON, default=list, nullable=False)
    meta_data = Column("metadata", JSON, nullable=True)
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_seen = Column(DateTime(timezone=True), onupdate=func.now())
    occurrence_count = Column(Integer, default=1)