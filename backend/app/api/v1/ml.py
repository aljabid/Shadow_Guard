"""ML classification API endpoints — additive, does not modify any existing route."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ml", tags=["ml"])


class ClassifyRequest(BaseModel):
    text: str


@router.get("/status")
async def ml_status():
    """Return model readiness, version info, and cross-validation metrics."""
    try:
        import sklearn as _sklearn
        runtime_version = _sklearn.__version__
    except Exception:
        runtime_version = "unknown"

    try:
        from app.ml.threat_classifier.classifier import get_classifier
        clf = get_classifier()
        artifact_version = clf.artifact_sklearn_version
        return {
            "enabled": clf.ready,
            "model_name": "TF-IDF + Logistic Regression",
            "model_version": clf.model_version,
            "sklearn_version": runtime_version,
            "artifact_sklearn_version": artifact_version,
            "version_match": artifact_version == runtime_version,
            "trained": clf.ready,
            "classes": 7,
            "metrics": clf.metrics() if clf.ready else {},
        }
    except Exception as exc:
        return {
            "enabled": False,
            "model_name": "TF-IDF + Logistic Regression",
            "model_version": "unknown",
            "sklearn_version": runtime_version,
            "artifact_sklearn_version": "unknown",
            "version_match": False,
            "trained": False,
            "error": str(exc),
        }


@router.post("/classify")
async def classify_text(body: ClassifyRequest):
    """Classify a single text message into one of 7 threat categories."""
    try:
        from app.ml.threat_classifier.classifier import get_classifier
        clf = get_classifier()
        return clf.classify(body.text)
    except Exception as exc:
        from app.ml.threat_classifier.fallback import FALLBACK_RESPONSE
        result = dict(FALLBACK_RESPONSE)
        result["reason"] = str(exc)
        return result
