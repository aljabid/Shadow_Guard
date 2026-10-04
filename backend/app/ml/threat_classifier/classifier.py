"""ThreatClassifier — loads the trained artifact and classifies text."""

from __future__ import annotations

import json
import logging
import pathlib
import sys
import warnings
from typing import Dict, Any

_log = logging.getLogger(__name__)

ARTIFACT_DIR = pathlib.Path(__file__).parent.parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "threat_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"


class ThreatClassifier:
    """Thin wrapper around a persisted sklearn Pipeline."""

    def __init__(self) -> None:
        self._pipeline = None
        self._labels: list[str] = []
        self._ready = False
        self._artifact_sklearn_version: str = "unknown"
        self._model_version: str = "unknown"
        self._load()

    def _load(self) -> None:
        if not MODEL_PATH.exists():
            return
        try:
            import joblib
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter("always")
                obj = joblib.load(MODEL_PATH)
            for w in caught:
                if "InconsistentVersionWarning" in str(w.category):
                    import sklearn as _sk
                    artifact_ver = obj.get("sklearn_version", "unknown")
                    _log.warning(
                        "sklearn version mismatch — artifact trained with %s, "
                        "runtime is %s. Re-run: python -m app.ml.threat_classifier.train",
                        artifact_ver, _sk.__version__,
                    )
            self._pipeline = obj["pipeline"]
            self._labels = list(obj["pipeline"].named_steps["clf"].classes_)
            self._artifact_sklearn_version = obj.get("sklearn_version", "unknown")
            self._model_version = obj.get("model_version", "1.0.0")
            self._ready = True
        except Exception:
            self._ready = False

    @property
    def ready(self) -> bool:
        return self._ready

    @property
    def artifact_sklearn_version(self) -> str:
        return self._artifact_sklearn_version

    @property
    def model_version(self) -> str:
        return self._model_version

    def classify(self, text: str) -> Dict[str, Any]:
        from app.ml.threat_classifier.fallback import FALLBACK_RESPONSE
        if not self._ready:
            return dict(FALLBACK_RESPONSE)

        from app.ml.threat_classifier.features import preprocess_text
        clean = preprocess_text(text)
        proba = self._pipeline.predict_proba([clean])[0]
        idx = int(proba.argmax())
        scores = {label: round(float(p), 4) for label, p in zip(self._labels, proba)}
        confidence = round(float(proba[idx]), 4)
        return {
            "label": self._labels[idx],
            "confidence": confidence,
            "low_confidence": confidence < 0.50,
            "scores": scores,
            "fallback": False,
        }

    def metrics(self) -> Dict[str, Any]:
        if not METRICS_PATH.exists():
            return {}
        try:
            return json.loads(METRICS_PATH.read_text(encoding="utf-8"))
        except Exception:
            return {}


# Module-level singleton (lazy-loaded on first import)
_instance: ThreatClassifier | None = None


def get_classifier() -> ThreatClassifier:
    global _instance
    if _instance is None:
        _instance = ThreatClassifier()
    return _instance


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m app.ml.threat_classifier.classifier \"<text>\"")
        sys.exit(1)

    clf = get_classifier()
    if not clf.ready:
        print("Model not ready. Run: python -m app.ml.threat_classifier.train")
        sys.exit(1)

    result = clf.classify(" ".join(sys.argv[1:]))
    print(json.dumps(result, ensure_ascii=False, indent=2))
    if result.get("low_confidence"):
        print("\n⚠ LOW CONFIDENCE — result may be unreliable")
