import re
from typing import Tuple, List
from app.modules.droper.nlp.vocabulary import RECRUITMENT_KEYWORDS, HIGH_RISK_KEYWORDS, BANK_KEYWORDS, CONTACT_PATTERNS
from app.modules.shared.nlp.russian_preprocessor import clean_text


class RecruitmentClassifier:
    def classify(self, text: str) -> Tuple[bool, float, dict]:
        text_lower = clean_text(text)
        recruitment_hits = [kw for kw in RECRUITMENT_KEYWORDS if kw in text_lower]
        high_risk_hits = [kw for kw in HIGH_RISK_KEYWORDS if kw in text_lower]
        bank_hits = [kw for kw in BANK_KEYWORDS if kw in text_lower]
        contact_hits = []
        for pattern in CONTACT_PATTERNS:
            contact_hits.extend(re.findall(pattern, text_lower))
        if not recruitment_hits:
            return False, 0.0, {}
        confidence = min(
            len(recruitment_hits) / 3.0 + len(high_risk_hits) * 0.15
            + len(bank_hits) * 0.1 + (0.1 if contact_hits else 0.0), 1.0
        )
        details = {
            "recruitment_keywords": recruitment_hits,
            "high_risk_keywords": high_risk_hits,
            "banks_mentioned": list(set(bank_hits)),
            "contact_info_found": list(set(contact_hits))[:5],
        }
        return True, round(confidence, 3), details

    def batch_classify(self, messages: List[dict]) -> List[dict]:
        flagged = []
        for msg in messages:
            is_r, confidence, details = self.classify(msg.get("text", ""))
            if is_r:
                flagged.append({**msg, "is_recruitment": True, "confidence": confidence, "details": details})
        return flagged


recruitment_classifier = RecruitmentClassifier()
