from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.entity import SharedEntity
from app.services.entity_service import EntityService

router = APIRouter(prefix="/entities", tags=["entities"])


@router.get("/")
async def search_entities(q: Optional[str] = None, entity_type: Optional[str] = None,
                          cross_module_only: bool = False, limit: int = Query(50, le=200),
                          db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = EntityService(db)
    if cross_module_only:
        return await service.get_cross_module_entities()
    if q:
        return await service.search_entities(q, entity_type, limit)
    result = await db.execute(select(SharedEntity).limit(limit))
    return result.scalars().all()


@router.get("/{entity_id}")
async def get_entity(entity_id: str, db: AsyncSession = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    result = await db.execute(select(SharedEntity).where(SharedEntity.id == entity_id))
    entity = result.scalar_one_or_none()
    if not entity:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Entity not found")
    return entity
