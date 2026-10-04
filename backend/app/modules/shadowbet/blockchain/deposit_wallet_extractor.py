import re
from typing import List
from app.modules.shared.nlp.russian_preprocessor import extract_crypto_addresses


def extract_from_gambling_content(text: str) -> List[str]:
    addresses = extract_crypto_addresses(text)
    deposit_pattern = (
        r"(?:депозит|deposit|пополнить|перевод|transfer|кошелек|wallet)"
        r".{0,100}"
        r"(T[A-Za-z0-9]{33}|0x[a-fA-F0-9]{40})"
    )
    context_matches = re.findall(deposit_pattern, text, re.IGNORECASE | re.DOTALL)
    addresses.extend(context_matches)
    return list(set(addresses))
