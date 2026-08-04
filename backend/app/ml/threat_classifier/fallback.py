"""Fallback response returned when the trained artifact is unavailable."""

FALLBACK_RESPONSE = {
    "label": "unknown",
    "confidence": 0.0,
    "scores": {},
    "fallback": True,
    "reason": "Model artifact not found. Run: python -m app.ml.threat_classifier.train",
}
