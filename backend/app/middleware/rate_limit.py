from fastapi import Request, HTTPException
import time
from collections import defaultdict

_request_counts = defaultdict(list)
RATE_LIMIT = 100
WINDOW = 60


async def rate_limit_middleware(request: Request, call_next):
    client_ip = request.client.host
    now = time.time()
    _request_counts[client_ip] = [t for t in _request_counts[client_ip] if now - t < WINDOW]
    if len(_request_counts[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests")
    _request_counts[client_ip].append(now)
    return await call_next(request)
