from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime
from app.models.entity import SharedEntity


class EntityService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def upsert_entity(self, entity_type: str, entity_value: str, source_module: str,
                            risk_score: int, tags: List[str] = [], metadata: Optional[dict] = None) -> SharedEntity:
        result = await self.db.execute(
            select(SharedEntity).where(SharedEntity.entity_type == entity_type, SharedEntity.entity_value == entity_value))
        entity = result.scalar_one_or_none()
        if entity:
            if source_module not in entity.source_modules:
                entity.source_modules = entity.source_modules + [source_module]
            entity.risk_score = max(entity.risk_score, risk_score)
            entity.occurrence_count += 1
            entity.last_seen = datetime.utcnow()
            entity.tags = list(set(entity.tags + tags))
            if metadata:
                existing = entity.meta_data or {}
                entity.meta_data = existing
                meta_data = metadata
        else:
            entity = SharedEntity(entity_type=entity_type, entity_value=entity_value,
                                  source_modules=[source_module], risk_score=risk_score, tags=tags, metadata=metadata)
            self.db.add(entity)
        await self.db.commit()
        await self.db.refresh(entity)
        return entity

    async def get_entity(self, entity_type: str, entity_value: str) -> Optional[SharedEntity]:
        result = await self.db.execute(
            select(SharedEntity).where(SharedEntity.entity_type == entity_type, SharedEntity.entity_value == entity_value))
        return result.scalar_one_or_none()

    async def get_cross_module_entities(self, min_modules: int = 2) -> List[SharedEntity]:
        result = await self.db.execute(select(SharedEntity))
        entities = result.scalars().all()
        return [e for e in entities if len(e.source_modules) >= min_modules]

    async def search_entities(self, query: str, entity_type: Optional[str] = None, limit: int = 50) -> List[SharedEntity]:
        stmt = select(SharedEntity).where(SharedEntity.entity_value.ilike(f"%{query}%"))
        if entity_type:
            stmt = stmt.where(SharedEntity.entity_type == entity_type)
        stmt = stmt.order_by(SharedEntity.risk_score.desc()).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()
