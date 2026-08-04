import asyncio
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.user import User, UserRole
from app.core.security import hash_password as get_password_hash


async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.username == "admin")
        )

        user = result.scalar_one_or_none()

        if user:
            user.hashed_password = get_password_hash("admin")
            user.is_active = True
            user.role = UserRole.admin
            print("Admin user password reset: admin / admin")
        else:
            user = User(
                username="admin",
                email="admin@shadowguard.local",
                hashed_password=get_password_hash("admin"),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(user)
            print("Admin user created: admin / admin")

        await db.commit()


if __name__ == "__main__":
    asyncio.run(main())