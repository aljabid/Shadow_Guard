"""
Additive ML enrichment helper.

Single entry point used by all ShadowGuard modules.
Never raises — returns a disabled dict on any failure.
Does NOT modify existing module behaviour.
"""

from __future__ import annotations

_DISABLED = {"enabled": False, "reason": "model_not_available"}


def classify_for_finding(text: str) -> dict:
    """
    Return an ml_classification dict for a finding's text.

    On success:
        {"enabled": True, "model_name": ..., "model_version": ...,
         "label": ..., "confidence": float, "low_confidence": bool}

    On any failure:
        {"enabled": False, "reason": "model_not_available"}
    """
    try:
        if not text or not isinstance(text, str) or not text.strip():
            return dict(_DISABLED)

        from app.ml.threat_classifier.classifier import get_classifier
        clf = get_classifier()
        if not clf.ready:
            return dict(_DISABLED)

        result = clf.classify(text)
        return {
            "enabled": True,
            "model_name": "TF-IDF + Logistic Regression",
            "model_version": clf.model_version,
            "label": result["label"],
            "confidence": result["confidence"],
            "low_confidence": result["low_confidence"],
        }
    except Exception:
        return dict(_DISABLED)
