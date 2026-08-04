import re
from typing import List


def clean_text(text: str) -> str:
    if not text:
        return ""

    text = str(text)

    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\n+", " ", text)
    text = re.sub(r"\t+", " ", text)

    return text.strip()


def normalize_case(text: str) -> str:
    return clean_text(text).lower()


def remove_urls(text: str) -> str:
    return re.sub(
        r"https?://\S+|www\.\S+",
        "",
        text or "",
        flags=re.IGNORECASE,
    )


def remove_usernames(text: str) -> str:
    return re.sub(
        r"@\w+",
        "",
        text or "",
    )


def tokenize(text: str) -> List[str]:
    text = normalize_case(text)

    return [
        token
        for token in re.split(r"[^a-zA-Zа-яА-Я0-9]+", text)
        if token
    ]


def contains_keywords(
    text: str,
    keywords: List[str],
) -> bool:
    text = normalize_case(text)

    return any(
        keyword.lower() in text
        for keyword in keywords
    )


def count_keyword_hits(
    text: str,
    keywords: List[str],
) -> int:
    text = normalize_case(text)

    hits = 0

    for keyword in keywords:
        if keyword.lower() in text:
            hits += 1

    return hits


def extract_sentences(text: str) -> List[str]:
    if not text:
        return []

    sentences = re.split(
        r"[.!?]+",
        clean_text(text),
    )

    return [
        s.strip()
        for s in sentences
        if s.strip()
    ]