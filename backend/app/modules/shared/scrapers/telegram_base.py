from telethon import TelegramClient
from telethon.sessions import StringSession
from typing import List, Optional
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class TelegramBase:
    def __init__(self):
        self._client: Optional[TelegramClient] = None
        self._client_api_id: Optional[int] = None
        self._client_session: str = ""
        self._client_loop: Optional[object] = None

    def _resolve_credentials(self) -> tuple[int, str, str]:
        """Resolve Telegram credentials: DB-configured keys first, env fallback."""
        try:
            from app.services.api_key_loader import api_key_loader
            api_id_str = api_key_loader.get("telegram_api", "api_id") or settings.TELEGRAM_API_ID
            api_hash = api_key_loader.get("telegram_api", "api_hash") or settings.TELEGRAM_API_HASH or ""
            session_str = api_key_loader.get("telegram_api", "session_string") or settings.TELEGRAM_SESSION_STRING or ""
        except Exception:
            api_id_str = settings.TELEGRAM_API_ID
            api_hash = settings.TELEGRAM_API_HASH or ""
            session_str = settings.TELEGRAM_SESSION_STRING or ""

        try:
            api_id = int(api_id_str) if api_id_str else 0
        except (TypeError, ValueError):
            api_id = 0

        return api_id, api_hash, session_str

    async def get_client(self) -> TelegramClient:
        from app.services.collector_status import collector_status as _cs
        _cs.mark_enabled("telegram")

        api_id, api_hash, session_str = self._resolve_credentials()

        if not api_id or not api_hash:
            reason = (
                "Telegram API credentials not configured. "
                "Set them in Settings → API Integrations → Telegram MTProto API."
            )
            _cs.mark_not_ready("telegram", reason)
            raise RuntimeError(reason)

        import asyncio as _asyncio
        try:
            current_loop = _asyncio.get_event_loop()
        except RuntimeError:
            current_loop = None

        session_changed = self._client_session != session_str
        loop_changed = self._client_loop is not current_loop

        # Re-create client if credentials changed, session changed, loop changed, or disconnected
        if (self._client is None
                or not self._client.is_connected()
                or self._client_api_id != api_id
                or session_changed
                or loop_changed):
            if self._client is not None:
                try:
                    await self._client.disconnect()
                except Exception:
                    pass
            try:
                self._client = TelegramClient(StringSession(session_str), api_id, api_hash)
                self._client_api_id = api_id
                self._client_session = session_str
                self._client_loop = current_loop
                await self._client.connect()
            except Exception as exc:
                _cs.mark_not_ready("telegram", f"Connection failed: {exc}")
                raise

        _cs.mark_ready("telegram")
        return self._client

    async def get_channel_messages(self, channel_username: str, limit: int = 100) -> List[dict]:
        from app.services.collector_status import collector_status as _cs
        try:
            client = await self.get_client()
        except RuntimeError as e:
            logger.warning(f"Telegram unavailable: {e}")
            return []

        messages = []
        try:
            async for message in client.iter_messages(channel_username, limit=limit):
                if message.text:
                    messages.append({
                        "id": message.id, "text": message.text,
                        "date": message.date.isoformat() if message.date else None,
                        "views": getattr(message, "views", 0),
                        "channel": channel_username,
                    })
            _cs.add_items("telegram", len(messages))
        except Exception as e:
            _cs.mark_error("telegram", f"{channel_username}: {e}")
            logger.error(f"Telegram error for {channel_username}: {e}")
        return messages

    async def get_channel_info(self, channel_username: str) -> Optional[dict]:
        from app.services.collector_status import collector_status as _cs
        try:
            client = await self.get_client()
        except RuntimeError as e:
            logger.warning(f"Telegram unavailable: {e}")
            return None

        try:
            entity = await client.get_entity(channel_username)
            _cs.add_items("telegram", 1)
            return {
                "id": entity.id,
                "title": getattr(entity, "title", ""),
                "username": getattr(entity, "username", ""),
                "participants_count": getattr(entity, "participants_count", 0),
            }
        except Exception as e:
            _cs.mark_error("telegram", f"get_entity({channel_username}): {e}")
            logger.error(f"Channel info error for {channel_username}: {e}")
            return None

    async def search_channels(self, query: str) -> List[dict]:
        from app.services.collector_status import collector_status as _cs
        try:
            client = await self.get_client()
        except RuntimeError as e:
            logger.warning(f"Telegram unavailable: {e}")
            return []

        results = []
        try:
            from telethon.tl.functions.contacts import SearchRequest
            result = await client(SearchRequest(q=query, limit=20))
            for chat in result.chats:
                results.append({
                    "id": chat.id,
                    "title": getattr(chat, "title", ""),
                    "username": getattr(chat, "username", ""),
                    "participants_count": getattr(chat, "participants_count", 0),
                })
            _cs.add_items("telegram", len(results))
        except Exception as e:
            _cs.mark_error("telegram", f"search('{query}'): {e}")
            logger.error(f"Channel search error for '{query}': {e}")
        return results


telegram_base = TelegramBase()
