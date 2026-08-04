from telethon.sync import TelegramClient
from telethon.sessions import StringSession

from app.core.config import settings

api_id = settings.TELEGRAM_API_ID
api_hash = settings.TELEGRAM_API_HASH

if not api_id or not api_hash:
    raise SystemExit(
        "TELEGRAM_API_ID / TELEGRAM_API_HASH not set. "
        "Configure them in backend/.env (see backend/.env.example) before running this script."
    )
api_id = int(api_id)

with TelegramClient("shadowguard", api_id, api_hash) as client:
    session_string = StringSession.save(client.session)
    print(session_string)