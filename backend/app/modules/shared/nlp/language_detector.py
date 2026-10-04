from typing import Literal

LanguageCode = Literal["ru", "kz", "en", "mixed"]

RUSSIAN_CHARS = set("абвгдеёжзийклмнопрстуфхцчшщъыьэюя")
KAZAKH_SPECIFIC = set("әіңғүұқөһ")
LATIN_CHARS = set("abcdefghijklmnopqrstuvwxyz")


def detect_language(text: str) -> LanguageCode:
    text_lower = text.lower()
    ru_count = sum(1 for c in text_lower if c in RUSSIAN_CHARS)
    kz_count = sum(1 for c in text_lower if c in KAZAKH_SPECIFIC)
    en_count = sum(1 for c in text_lower if c in LATIN_CHARS)
    total = max(ru_count + kz_count + en_count, 1)
    if kz_count / total > 0.05:
        return "kz"
    if ru_count / total > 0.3:
        return "mixed" if en_count / total > 0.3 else "ru"
    if en_count / total > 0.3:
        return "en"
    return "mixed"


def is_russian_or_kazakh(text: str) -> bool:
    return detect_language(text) in ("ru", "kz", "mixed")
