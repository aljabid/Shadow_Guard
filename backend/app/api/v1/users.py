from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.core.database import get_db
from app.api.deps import require_admin
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=UserResponse)
async def create_user(request: UserCreateRequest, db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(require_admin)):
    return await AuthService(db).create_user(email=request.email, username=request.username,
                                             password=request.password, role=request.role)


@router.get("/", response_model=List[UserResponse])
async def list_users(db: AsyncSession = Depends(get_db), current_user: User = Depends(require_admin)):
    result = await db.execute(select(User))
    return result.scalars().all()


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, request: UserUpdateRequest, db: AsyncSession = Depends(get_db),
                      current_user: User = Depends(require_admin)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        from app.core.exceptions import NotFoundError
        raise NotFoundError("User not found")
    if request.is_active is not None:
        user.is_active = request.is_active
    if request.role:
        user.role = UserRole(request.role)
    await db.commit()
    return user
