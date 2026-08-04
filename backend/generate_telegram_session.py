"""
Telegram session string generator for ShadowGuard.

Run this ONCE interactively. You need:
  - Your phone number registered with Telegram
  - Access to the OTP code (SMS or Telegram app)

Usage:
    cd backend
    python generate_telegram_session.py

After successful login, the session string is saved to the database
automatically. Live module scans will then work.
"""
import asyncio
from telethon import TelegramClient
from telethon.sessions import StringSession


async def _save_to_db(session_string: str, api_id: int, api_hash: str):
    try:
        from app.core.database import AsyncSessionLocal
        from app.models.api_integration import ApiIntegration
        from sqlalchemy import select

        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(ApiIntegration).where(ApiIntegration.name == "telegram_api")
            )
            integration = result.scalar_one_or_none()

            if integration:
                new_config = dict(integration.config or {})
                new_config["api_id"] = str(api_id)
                new_config["api_hash"] = api_hash
                new_config["session_string"] = session_string
                integration.config = new_config
                integration.status = "connected"
                integration.is_enabled = True
                await db.commit()
                print("\n[OK] Session string saved to database successfully.")
                print("     ShadowGuard live scans can now authenticate with Telegram.")
            else:
                print("\n[WARN] telegram_api row not found in DB — copy the string below manually.")
                print(session_string)
    except Exception as exc:
        print(f"\n[WARN] Could not save to DB ({exc}) — copy the string below manually:")
        print(session_string)


async def main():
    from app.core.config import settings

    api_id = settings.TELEGRAM_API_ID
    api_hash = settings.TELEGRAM_API_HASH

    if not api_id or not api_hash:
        raise SystemExit(
            "TELEGRAM_API_ID / TELEGRAM_API_HASH not set. "
            "Configure them in backend/.env (see backend/.env.example) before running this script."
        )
    api_id = int(api_id)

    print("=" * 60)
    print("  ShadowGuard — Telegram Session Generator")
    print(f"  API ID: {api_id}")
    print("=" * 60)
    print()
    print("You will be prompted for your Telegram phone number.")
    print("Then enter the OTP code you receive via SMS or Telegram app.")
    print()

    client = TelegramClient(StringSession(), api_id, api_hash)
    await client.start()

    session_string = client.session.save()
    await client.disconnect()

    print()
    print("=" * 60)
    print("  Authentication successful!")
    print(f"  Session length: {len(session_string)} characters")
    print("=" * 60)

    await _save_to_db(session_string, api_id, api_hash)

    print()
    print("Next steps:")
    print("  1. Settings → API Integrations → Telegram MTProto API → Test Connection")
    print("  2. Run a live module scan from the Dashboard")


if __name__ == "__main__":
    asyncio.run(main())

