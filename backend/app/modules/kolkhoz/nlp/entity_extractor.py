import re
from typing import List
from app.modules.kolkhoz.config import WATCHED_EXCHANGES


def extract_exchange_mentions(text: str) -> List[str]:
    text_lower = text.lower()
    mentioned = []
    for exchange in WATCHED_EXCHANGES:
        if exchange["name"].lower() in text_lower:
            mentioned.append(exchange["name"])
        for channel in exchange.get("telegram_channels", []):
            if channel.lower() in text_lower:
                mentioned.append(exchange["name"])
    return list(set(mentioned))


def extract_wallet_addresses(text: str) -> List[str]:
    tron = re.findall(r"T[A-Za-z0-9]{33}", text)
    eth = re.findall(r"0x[a-fA-F0-9]{40}", text)
    return list(set(tron + eth))
