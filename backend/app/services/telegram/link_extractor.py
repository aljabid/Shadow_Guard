import re
from typing import List

TG_LINK_RE = re.compile(r"(?:https?://)?t\.me/([a-zA-Z0-9_]{5,32})")
TG_HANDLE_RE = re.compile(r"@([a-zA-Z0-9_]{5,32})")


def extract_telegram_usernames(text: str) -> List[str]:
    if not text:
        return []

    links = TG_LINK_RE.findall(text)
    handles = TG_HANDLE_RE.findall(text)

    found = links + handles
    seen = set()
    output = []

    for item in found:
        clean = item.strip().replace("/", "")

        if clean.lower() not in seen:
            seen.add(clean.lower())
            output.append(clean)

    return output