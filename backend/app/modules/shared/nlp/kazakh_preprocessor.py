import re
from typing import List

KAZAKH_STOPWORDS = {
    "және","да","де","бар","жоқ","бұл","осы","сол","үшін","деп",
    "туралы","болып","оның","бірақ","немесе","егер","онда","болады",
}


def clean_kazakh_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"[^\w\s\-]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_kazakh(text: str) -> List[str]:
    text = clean_kazakh_text(text)
    tokens = text.split()
    return [t for t in tokens if t not in KAZAKH_STOPWORDS and len(t) > 1]


def extract_iin(text: str) -> List[str]:
    pattern = r"\b\d{12}\b"
    candidates = re.findall(pattern, text)
    return [c for c in candidates if _is_valid_iin(c)]


def _is_valid_iin(iin: str) -> bool:
    if len(iin) != 12:
        return False
    try:
        month = int(iin[2:4])
        day = int(iin[4:6])
        return 1 <= month <= 12 and 1 <= day <= 31
    except ValueError:
        return False
