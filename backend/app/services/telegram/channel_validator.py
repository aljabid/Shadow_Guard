from typing import Optional, Dict, Any


def clean_username(value: str) -> str:
    return (
        value.replace("@", "")
        .replace("https://t.me/", "")
        .replace("http://t.me/", "")
        .replace("t.me/", "")
        .strip()
        .strip("/")
    )


async def validate_public_channel(username: str) -> Optional[Dict[str, Any]]:
    clean = clean_username(username)
    if not clean:
        return None

    try:
        from app.modules.shared.scrapers.telegram_base import telegram_base
        info = await telegram_base.get_channel_info(clean)
        if not info:
            return None

        tg_username = info.get("username") or clean
        title = info.get("title") or tg_username
        member_count = info.get("participants_count") or 0

        return {
            "username": tg_username,
            "title": title,
            "link": f"https://t.me/{tg_username}" if tg_username else None,
            "member_count": member_count,
            "description": "",
            "is_public": True,
        }
    except Exception:
        return None