"""Training script for the ShadowGuard Threat Classifier.

Usage:
    python -m app.ml.threat_classifier.train
    python -m app.ml.threat_classifier.train --data path/to/custom.csv
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys

DATA_DEFAULT = pathlib.Path(__file__).parent.parent / "data" / "training_messages.csv"
ARTIFACT_DIR = pathlib.Path(__file__).parent.parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "threat_model.joblib"
METRICS_PATH = ARTIFACT_DIR / "metrics.json"


def train(data_path: pathlib.Path) -> None:
    try:
        import joblib
        import pandas as pd
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import classification_report, accuracy_score
        from sklearn.model_selection import StratifiedKFold, cross_val_predict
        from sklearn.pipeline import Pipeline
    except ImportError as exc:
        print(f"[train] Missing dependency: {exc}")
        print("Install with: pip install scikit-learn pandas joblib")
        sys.exit(1)

    from app.ml.threat_classifier.features import preprocess_text
    from app.ml.threat_classifier.labels import LABELS

    print(f"[train] Loading data from {data_path}")
    df = pd.read_csv(data_path, encoding="utf-8")
    if "text" not in df.columns or "label" not in df.columns:
        print("[train] CSV must have 'text' and 'label' columns.")
        sys.exit(1)

    df = df.dropna(subset=["text", "label"])
    df["text"] = df["text"].apply(preprocess_text)

    X = df["text"].tolist()
    y = df["label"].tolist()

    unknown = set(y) - set(LABELS)
    if unknown:
        print(f"[train] Unknown labels in data: {unknown}")
        sys.exit(1)

    print(f"[train] {len(X)} samples, {len(set(y))} classes")

    pipeline = Pipeline([
        ("tfidf", TfidfVectorizer(
            analyzer="word",
            ngram_range=(1, 2),
            max_features=50_000,
            sublinear_tf=True,
            min_df=1,
        )),
        ("clf", LogisticRegression(
            max_iter=1000,
            C=2.0,
            solver="lbfgs",
            class_weight="balanced",
        )),
    ])

    # Cross-validated predictions for honest metrics
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    y_pred_cv = cross_val_predict(pipeline, X, y, cv=cv)
    acc = accuracy_score(y, y_pred_cv)
    report = classification_report(y, y_pred_cv, output_dict=True)
    print(f"[train] CV accuracy: {acc:.3f}")
    print(classification_report(y, y_pred_cv))

    # Fit final model on all data
    pipeline.fit(X, y)

    import sklearn as _sklearn
    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    ordered_labels = list(pipeline.named_steps["clf"].classes_)
    joblib.dump({
        "pipeline": pipeline,
        "labels": ordered_labels,
        "sklearn_version": _sklearn.__version__,
        "model_version": "1.0.0",
    }, MODEL_PATH)
    print(f"[train] Model saved → {MODEL_PATH}  (sklearn {_sklearn.__version__})")

    metrics = {"accuracy": round(acc, 4), "report": report}
    METRICS_PATH.write_text(json.dumps(metrics, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[train] Metrics saved → {METRICS_PATH}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train ShadowGuard Threat Classifier")
    parser.add_argument("--data", type=pathlib.Path, default=DATA_DEFAULT)
    args = parser.parse_args()
    train(args.data)
