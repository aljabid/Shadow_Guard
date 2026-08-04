import re
from typing import List
from app.modules.shadowbet.config import AFFILIATE_PATTERNS


def extract_affiliate_codes(text: str) -> List[dict]:
    results = []
    for pattern in AFFILIATE_PATTERNS:
        for match in re.finditer(pattern, text, re.IGNORECASE):
            try:
                code = match.group(1)
                results.append({
                    "code": code, "pattern": pattern,
                    "context": text[max(0, match.start() - 20): match.end() + 20].strip(),
                })
            except IndexError:
                pass
    return results
