"""Text pre-processing for the ShadowGuard Threat Classifier."""

import re
import unicodedata


def preprocess_text(text: str) -> str:
    """Normalise and clean raw message text before vectorisation."""
    if not isinstance(text, str):
        text = str(text)

    # Unicode normalise (handles Cyrillic/Latin lookalikes)
    text = unicodedata.normalize("NFKC", text)

    # Lower-case
    text = text.lower()

    # Strip URLs (http/https/ftp)
    text = re.sub(r"https?://\S+|ftp://\S+", " URL ", text)

    # Strip Telegram handles and channels
    text = re.sub(r"@\w+", " TG ", text)

    # Strip phone numbers
    text = re.sub(r"[\+]?[\d][\d\s\-\(\)]{7,}[\d]", " PHONE ", text)

    # Strip crypto addresses (Bitcoin-style 26-35 chars, Ethereum 0x…)
    text = re.sub(r"\b(0x[0-9a-fA-F]{40}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b", " ADDR ", text)

    # Collapse multiple whitespace / newlines
    text = re.sub(r"[\r\n\t]+", " ", text)
    text = re.sub(r"\s{2,}", " ", text)

    return text.strip()
