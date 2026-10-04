import spacy
import logging

logger = logging.getLogger(__name__)
_ru_model = None


def get_russian_nlp():
    global _ru_model
    if _ru_model is None:
        try:
            _ru_model = spacy.load("ru_core_news_sm")
        except OSError:
            logger.warning("Russian spaCy model not found, using blank")
            _ru_model = spacy.blank("ru")
    return _ru_model


def extract_entities_ru(text: str) -> list:
    nlp = get_russian_nlp()
    doc = nlp(text[:10000])
    return [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
