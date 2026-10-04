from typing import List
from app.modules.shared.nlp.russian_preprocessor import extract_crypto_addresses


def extract_from_text(text: str) -> List[str]:
    return list(set(extract_crypto_addresses(text)))


def extract_from_messages(messages: List[dict]) -> List[str]:
    all_addresses = []
    for msg in messages:
        all_addresses.extend(extract_from_text(msg.get("text", "")))
    return list(set(all_addresses))
