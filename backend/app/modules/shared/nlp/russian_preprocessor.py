import re
from typing import List

RUSSIAN_STOPWORDS = {
    "и","в","не","на","я","что","тот","быть","он","это","как","мы","по","но",
    "они","к","у","же","вы","за","бы","из","от","так","его","до","при","ещё",
    "а","во","вот","уже","ни","для","о","её","со",
}


def clean_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#\w+", " ", text)
    text = re.sub(r"[^\w\s\-%]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def tokenize(text: str) -> List[str]:
    text = clean_text(text)
    tokens = text.split()
    return [t for t in tokens if t not in RUSSIAN_STOPWORDS and len(t) > 1]


def extract_numbers(text: str) -> List[float]:
    pattern = r"\d+(?:[.,]\d+)?"
    matches = re.findall(pattern, text)
    results = []
    for m in matches:
        try:
            results.append(float(m.replace(",", ".")))
        except ValueError:
            pass
    return results


def extract_percentages(text: str) -> List[float]:
    pattern = r"(\d+(?:[.,]\d+)?)\s*%"
    matches = re.findall(pattern, text)
    results = []
    for m in matches:
        try:
            results.append(float(m.replace(",", ".")))
        except ValueError:
            pass
    return results


def extract_phone_numbers(text: str) -> List[str]:
    pattern = r"(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}"
    return re.findall(pattern, text)


def extract_crypto_addresses(text: str) -> List[str]:
    tron = re.findall(r"T[A-Za-z0-9]{33}", text)
    eth = re.findall(r"0x[a-fA-F0-9]{40}", text)
    btc = re.findall(r"[13][a-km-zA-HJ-NP-Z1-9]{25,34}", text)
    return tron + eth + btc


def extract_domains(text: str) -> List[str]:
    pattern = r"(?:https?://)?(?:www\.)?([a-zA-Z0-9\-]+\.[a-zA-Z]{2,})(?:/\S*)?"
    return re.findall(pattern, text)
