from typing import Tuple
from app.modules.kolkhoz.nlp.vocabulary import COMPLAINT_KEYWORDS, SHUTDOWN_KEYWORDS, URGENCY_KEYWORDS, POSITIVE_KEYWORDS
from app.modules.shared.nlp.russian_preprocessor import clean_text


class ComplaintClassifier:
    def classify(self, text: str) -> Tuple[str, float]:
        text_lower = clean_text(text)
        complaint_hits = sum(1 for kw in COMPLAINT_KEYWORDS if kw in text_lower)
        shutdown_hits = sum(1 for kw in SHUTDOWN_KEYWORDS if kw in text_lower)
        urgency_hits = sum(1 for kw in URGENCY_KEYWORDS if kw in text_lower)
        positive_hits = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
        total_negative = complaint_hits + shutdown_hits * 2 + urgency_hits
        if total_negative == 0:
            return "neutral", 0.0
        confidence = min(total_negative / 5.0, 1.0)
        if positive_hits > total_negative:
            return "positive", 0.3
        if shutdown_hits >= 2:
            return "shutdown_signal", min(confidence + 0.3, 1.0)
        if complaint_hits >= 3:
            return "complaint", confidence
        if urgency_hits >= 2:
            return "urgent_complaint", min(confidence + 0.2, 1.0)
        return "complaint", confidence * 0.5

    def batch_classify(self, messages: list) -> list:
        results = []
        for msg in messages:
            label, confidence = self.classify(msg.get("text", ""))
            if label != "neutral":
                results.append({**msg, "label": label, "confidence": confidence})
        return results


classifier = ComplaintClassifier()
