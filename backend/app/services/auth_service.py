from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User, UserRole
from app.core.exceptions import AuthError, NotFoundError
from app.schemas.auth import LoginRequest, TokenResponse
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def login(self, data: LoginRequest) -> TokenResponse:
        result = await self.db.execute(
            select(User).where(User.username == data.username)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.hashed_password):
            raise AuthError("Invalid username or password")

        if not user.is_active:
            raise AuthError("Account is disabled")

        user.last_login = datetime.utcnow()
        await self.db.commit()

        access_token = create_access_token(
            subject=str(user.id),
            extra={
                "role": user.role.value,
                "username": user.username,
            },
        )

        refresh_token = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user_id=str(user.id),
            username=user.username,
            role=user.role.value,
        )

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)

        if not payload or payload.get("type") != "refresh":
            raise AuthError("Invalid refresh token")

        try:
            user_id = UUID(payload["sub"])
        except Exception:
            raise AuthError("Invalid token subject")

        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user or not user.is_active:
            raise AuthError("User not found or disabled")

        access_token = create_access_token(
            subject=str(user.id),
            extra={
                "role": user.role.value,
                "username": user.username,
            },
        )

        new_refresh = create_refresh_token(subject=str(user.id))

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh,
            user_id=str(user.id),
            username=user.username,
            role=user.role.value,
        )

    async def create_user(
        self,
        email: str,
        username: str,
        password: str,
        role: str = "analyst",
    ) -> User:
        user = User(
            email=email,
            username=username,
            hashed_password=hash_password(password),
            role=UserRole(role),
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

        return user

    async def get_user_by_id(self, user_id: str) -> User:
        try:
            parsed_user_id = UUID(user_id)
        except Exception:
            raise NotFoundError("User not found")

        result = await self.db.execute(
            select(User).where(User.id == parsed_user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            raise NotFoundError("User not found")

        return user