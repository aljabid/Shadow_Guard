from app.modules.piramida.nlp.vocabulary import REFERRAL_KEYWORDS
from app.modules.shared.nlp.russian_preprocessor import clean_text


def detect_referral_structure(text: str) -> dict:
    text_lower = clean_text(text)
    hits = [kw for kw in REFERRAL_KEYWORDS if kw in text_lower]
    depth = [kw for kw in ["уровень","level","поколение","линия","ветка"] if kw in text_lower]
    return {
        "has_referral_program": len(hits) > 0,
        "is_multilevel": len(depth) > 0,
        "referral_keywords_found": hits,
        "depth_indicators": depth,
        "confidence": round(min(len(hits) * 0.2 + len(depth) * 0.3, 1.0), 3),
    }
