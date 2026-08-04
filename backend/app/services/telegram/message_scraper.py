from typing import List, Dict, Any
from app.services.telegram.channel_validator import clean_username


async def scrape_public_messages(username: str, limit: int = 100) -> List[Dict[str, Any]]:
    clean = clean_username(username)
    if not clean:
        return []

    try:
        from app.modules.shared.scrapers.telegram_base import telegram_base
        raw = await telegram_base.get_channel_messages(clean, limit=limit)
        messages = []
        for msg in raw:
            text = msg.get("text", "")
            if not text.strip():
                continue
            messages.append({
                "message_id": msg.get("id"),
                "text": text,
                "date": msg.get("date"),
                "views": msg.get("views") or 0,
                "forwards": 0,
                "link": f"https://t.me/{clean}/{msg.get('id', 0)}",
            })
        return messages
    except Exception:
        return []