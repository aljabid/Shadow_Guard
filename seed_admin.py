import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings
from app.models.user import User, UserRole
from app.core.security import hash_password
from sqlalchemy import select

async def seed():
    engine = create_async_engine(settings.DATABASE_URL)
    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as db:
        result = await db.execute(select(User).where(User.username == 'admin'))
        existing = result.scalar_one_or_none()
        if existing:
            print('Admin already exists:', existing.username)
        else:
            user = User(
                email='admin@shadowguard.kz',
                username='admin',
                hashed_password=hash_password('Admin1234!'),
                role=UserRole.admin,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print('Created admin user: admin / Admin1234!')
    await engine.dispose()

asyncio.run(seed())