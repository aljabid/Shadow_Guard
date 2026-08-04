# ML Artifacts

This directory is populated by the training script and is **not committed to git**.

## Files generated here

| File | Description |
|------|-------------|
| `threat_model.joblib` | Serialised sklearn Pipeline (TF-IDF + LogisticRegression) |
| `metrics.json` | Cross-validation accuracy and per-class classification report |

## How to generate

```bash
cd backend
python -m app.ml.threat_classifier.train
```

## How to validate

```bash
python -m app.ml.threat_classifier.validate
```

## How to classify a single message

```bash
python -m app.ml.threat_classifier.classifier "Нужны дропы, платим 10%"
```
