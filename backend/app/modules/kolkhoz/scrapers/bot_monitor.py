import time
import httpx
import logging

logger = logging.getLogger(__name__)


class BotMonitor:
    async def check_telegram_bot(self, bot_username: str) -> dict:
        url = f"https://t.me/{bot_username.lstrip('@')}"
        start = time.time()
        reachable = False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(url)
                reachable = resp.status_code == 200
        except Exception as e:
            logger.warning(f"Bot check failed for {bot_username}: {e}")
        return {"bot": bot_username, "reachable": reachable, "latency_seconds": round(time.time() - start, 2)}

    async def check_support_channel(self, channel: str, expected_response_hours: float = 2.0) -> dict:
        from app.modules.shared.scrapers.telegram_base import telegram_base
        messages = await telegram_base.get_channel_messages(channel, limit=10)
        if not messages:
            return {"channel": channel, "support_active": False, "last_message_hours_ago": None, "signal": "no_messages"}
        from datetime import datetime
        last_msg_date = messages[0].get("date")
        if last_msg_date:
            last_dt = datetime.fromisoformat(last_msg_date)
            hours_ago = (datetime.utcnow() - last_dt).total_seconds() / 3600
            is_active = hours_ago < expected_response_hours
        else:
            hours_ago = None
            is_active = False
        return {
            "channel": channel,
            "support_active": is_active,
            "last_message_hours_ago": round(hours_ago, 1) if hours_ago else None,
            "signal": "active" if is_active else "silent",
        }


bot_monitor = BotMonitor()
