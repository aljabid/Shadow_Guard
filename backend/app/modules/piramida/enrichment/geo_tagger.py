from typing import List

COUNTRY_KEYWORDS = {
    "Kazakhstan": ["казахстан","казахстане","kz","almaty","алматы","астана"],
    "Russia": ["россия","russia","ru","москва","moscow"],
    "Kyrgyzstan": ["кыргызстан","киргизия","бишкек","bishkek","kg"],
    "Belarus": ["беларусь","белоруссия","минск","minsk","by"],
}


def tag_countries(text: str) -> List[str]:
    text_lower = text.lower()
    return [country for country, keywords in COUNTRY_KEYWORDS.items() if any(kw in text_lower for kw in keywords)]


def is_cross_border(text: str) -> bool:
    return len(tag_countries(text)) >= 2
