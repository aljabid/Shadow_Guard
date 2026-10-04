from app.modules.piramida.nlp.vocabulary import URGENCY_KEYWORDS
from app.modules.shared.nlp.russian_preprocessor import clean_text


def detect_urgency(text: str) -> dict:
    text_lower = clean_text(text)
    hits = [kw for kw in URGENCY_KEYWORDS if kw in text_lower]
    scarcity = [p for p in ["осталось","мест","слотов"] if p in text_lower]
    return {
        "has_urgency": len(hits) > 0,
        "urgency_keywords": hits,
        "scarcity_signals": scarcity,
        "urgency_score": min(len(hits) * 15 + len(scarcity) * 10, 100),
    }
