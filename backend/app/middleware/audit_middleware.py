from fastapi import Request
import logging

logger = logging.getLogger(__name__)


async def audit_middleware(request: Request, call_next):
    response = await call_next(request)
    logger.info(f"{request.method} {request.url.path} -> {response.status_code}")
    return response
