from typing import Tuple
from app.modules.piramida.nlp.vocabulary import INVESTMENT_KEYWORDS, PYRAMID_COVER_STORIES
from app.modules.shared.nlp.russian_preprocessor import clean_text


class InvestmentClassifier:
    def classify(self, text: str) -> Tuple[bool, float]:
        text_lower = clean_text(text)
        invest_hits = sum(1 for kw in INVESTMENT_KEYWORDS if kw in text_lower)
        cover_hits = sum(1 for kw in PYRAMID_COVER_STORIES if kw in text_lower)
        if invest_hits == 0:
            return False, 0.0
        return True, round(min(invest_hits * 0.2 + cover_hits * 0.15, 1.0), 3)

    def batch_classify(self, messages: list) -> list:
        return [msg for msg in messages if self.classify(msg.get("text", ""))[0]]


investment_classifier = InvestmentClassifier()
