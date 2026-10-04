import re
from typing import List, Optional
from app.modules.piramida.nlp.vocabulary import RETURN_PATTERNS

PERIOD_MAP = {
    "в месяц": "monthly","ежемесячно": "monthly",
    "в неделю": "weekly","еженедельно": "weekly",
    "в день": "daily","ежедневно": "daily",
    "в год": "yearly","apy": "yearly","apr": "yearly",
}


class ReturnExtractor:
    def extract(self, text: str) -> List[dict]:
        text_lower = text.lower()
        results = []
        for pattern in RETURN_PATTERNS:
            for match in re.finditer(pattern, text_lower):
                try:
                    rate = float(match.group(1).replace(",", "."))
                    if rate > 1000:
                        continue
                    period = "monthly"
                    context = text_lower[max(0, match.start() - 30): match.end() + 30]
                    for kw, pval in PERIOD_MAP.items():
                        if kw in context:
                            period = pval
                            break
                    results.append({
                        "rate": rate, "period": period,
                        "monthly_equivalent": self._to_monthly(rate, period),
                        "context": context.strip(),
                        "is_suspicious": rate >= 3.0,
                        "is_critical": rate >= 10.0,
                    })
                except (ValueError, IndexError):
                    continue
        return results

    def _to_monthly(self, rate: float, period: str) -> float:
        return round({"daily": rate * 30, "weekly": rate * 4.3, "monthly": rate, "yearly": rate / 12}.get(period, rate), 2)

    def get_max_monthly_return(self, text: str) -> Optional[float]:
        extractions = self.extract(text)
        if not extractions:
            return None
        return max(e["monthly_equivalent"] for e in extractions)


return_extractor = ReturnExtractor()
