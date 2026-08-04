from fastapi import APIRouter
from app.api.v1 import auth, modules, alerts, entities, reports, users, investigations, integrations
try:
    from app.api.v1 import ml as _ml_router
    _ml_available = True
except ImportError:
    _ml_router = None  # type: ignore[assignment]
    _ml_available = False

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(modules.router)
router.include_router(alerts.router)
router.include_router(entities.router)
router.include_router(reports.router)
router.include_router(users.router)
router.include_router(investigations.router)
router.include_router(integrations.router)
if _ml_available and _ml_router is not None:
    router.include_router(_ml_router.router)
