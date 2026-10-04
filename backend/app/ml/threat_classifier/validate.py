"""Validation script — loads saved artifact and prints classification report.

Usage:
    python -m app.ml.threat_classifier.validate
    python -m app.ml.threat_classifier.validate --data path/to/test.csv
"""

from __future__ import annotations

import argparse
import pathlib
import sys

DATA_DEFAULT = pathlib.Path(__file__).parent.parent / "data" / "training_messages.csv"
ARTIFACT_DIR = pathlib.Path(__file__).parent.parent / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "threat_model.joblib"


def validate(data_path: pathlib.Path) -> None:
    try:
        import joblib
        import pandas as pd
        from sklearn.metrics import classification_report, confusion_matrix
    except ImportError as exc:
        print(f"[validate] Missing dependency: {exc}")
        sys.exit(1)

    if not MODEL_PATH.exists():
        print(f"[validate] Model not found at {MODEL_PATH}")
        print("Run: python -m app.ml.threat_classifier.train")
        sys.exit(1)

    from app.ml.threat_classifier.features import preprocess_text

    obj = joblib.load(MODEL_PATH)
    pipeline = obj["pipeline"]
    labels = obj["labels"]

    df = pd.read_csv(data_path, encoding="utf-8").dropna(subset=["text", "label"])
    df["text"] = df["text"].apply(preprocess_text)

    X = df["text"].tolist()
    y_true = df["label"].tolist()
    y_pred = pipeline.predict(X)

    print("\n=== Classification Report ===")
    print(classification_report(y_true, y_pred, labels=labels, zero_division=0))

    print("=== Confusion Matrix ===")
    cm = confusion_matrix(y_true, y_pred, labels=labels)
    header = "\t".join(f"{l[:8]:>8}" for l in labels)
    print(f"{'':>8}\t{header}")
    for label, row in zip(labels, cm):
        row_str = "\t".join(f"{v:>8}" for v in row)
        print(f"{label[:8]:>8}\t{row_str}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Validate ShadowGuard Threat Classifier")
    parser.add_argument("--data", type=pathlib.Path, default=DATA_DEFAULT)
    args = parser.parse_args()
    validate(args.data)
