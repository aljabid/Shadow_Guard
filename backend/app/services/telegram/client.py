from telethon import TelegramClient
from telethon.sessions import StringSession
from app.core.config import settings


def get_telegram_client() -> TelegramClient:
    return TelegramClient(
        StringSession(settings.TELEGRAM_SESSION_STRING),
        int(settings.TELEGRAM_API_ID),
        settings.TELEGRAM_API_HASH,
    )