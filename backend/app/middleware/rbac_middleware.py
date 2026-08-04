from fastapi import Request


async def rbac_middleware(request: Request, call_next):
    return await call_next(request)
