from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse


class AuthError(HTTPException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=401, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(status_code=403, detail=detail)


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=404, detail=detail)


class ModuleError(HTTPException):
    def __init__(self, detail: str = "Module execution failed"):
        super().__init__(status_code=500, detail=detail)


class ValidationError(HTTPException):
    def __init__(self, detail: str = "Input validation failed"):
        super().__init__(status_code=422, detail=detail)


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail, "status_code": exc.status_code},
    )


async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "status_code": 500},
    )
