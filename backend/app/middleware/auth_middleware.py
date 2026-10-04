from fastapi import Request
from app.core.security import decode_token


async def auth_middleware(request: Request, call_next):
    return await call_next(request)
