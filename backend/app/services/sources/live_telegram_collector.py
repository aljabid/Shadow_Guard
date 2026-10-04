from typing import List, Dict, Any

from app.services.sources.telegram_connector import telegram_source_connector


class LiveTelegramCollector:
    async def collect(
        self,
        seeds: List[str],
        keywords: List[str],
        limit: int = 10,
        message_limit: int = 30,
    ) -> List[Dict[str, Any]]:
        findings = await telegram_source_connector.collect(
            seeds=seeds,
            keywords=keywords,
            limit=limit,
            message_limit=message_limit,
        )

        normalized = []

        for item in findings:
            source_data = item.get("source_data") or {}

            normalized.append(
                {
                    **item,
                    "source": "live_telegram",
                    "source_type": "telegram",
                    "title": item.get("title") or "Live Telegram match",
                    "url": item.get("url") or source_data.get("source_url"),
                    "source_data": {
                        **source_data,
                        "source_type": "telegram",
                        "metadata": {
                            **(source_data.get("metadata") or {}),
                            "collector": "live_telegram",
                        },
                    },
                    "metadata": {
                        **(item.get("metadata") or {}),
                        "collector": "live_telegram",
                    },
                }
            )

        return normalized


live_telegram_collector = LiveTelegramCollector()