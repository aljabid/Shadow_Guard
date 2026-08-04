import asyncio
from telethon import TelegramClient

from app.core.config import settings

api_id = settings.TELEGRAM_API_ID
api_hash = settings.TELEGRAM_API_HASH

async def main():
    if not api_id or not api_hash:
        raise SystemExit(
            "TELEGRAM_API_ID / TELEGRAM_API_HASH not set. "
            "Configure them in backend/.env (see backend/.env.example) before running this script."
        )

    client = TelegramClient(
        "shadowguard",
        int(api_id),
        api_hash
    )

    await client.connect()

    print("Authorized:", await client.is_user_authorized())

    me = await client.get_me()

    print("Name:", me.first_name)
    print("Username:", me.username)

    await client.disconnect()

asyncio.run(main())