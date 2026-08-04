import re
from typing import List
from app.modules.shared.nlp.russian_preprocessor import extract_domains


def extract_betting_domains(text: str) -> List[str]:
    domains = extract_domains(text)
    betting_keywords = ["bet", "casino", "poker", "slots", "game", "win", "play"]
    filtered = [d for d in domains if any(kw in d.lower() for kw in betting_keywords)]
    return list(set(filtered + domains))


def normalize_domain(domain: str) -> str:
    domain = domain.lower().strip()
    domain = re.sub(r"^(?:https?://)?(?:www\.)?", "", domain)
    return domain.split("/")[0]
