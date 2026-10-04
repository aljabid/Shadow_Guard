def score(validity_score: float) -> float:
    return max(0.0, 100.0 - validity_score)
