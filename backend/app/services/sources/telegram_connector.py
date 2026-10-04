from typing import List, Dict, Any
from app.services.telegram.discovery_service import telegram_discovery_service
from app.services.sources.source_normalizer import normalize_source


class TelegramSourceConnector:
    async def collect(
        self,
        seeds: List[str],
        keywords: List[str],
        limit: int = 10,
        message_limit: int = 30,
    ) -> List[Dict[str, Any]]:
        results = []

        channels = await telegram_discovery_service.discover_public_channels(
            seeds=seeds,
            limit=limit,
            include_messages=True,
            message_limit=message_limit,
        )

        for channel in channels:
            messages = channel.get("messages", []) or []
            text_blob = " ".join(m.get("text", "") for m in messages)

            matched_keywords = [
                kw for kw in keywords if kw.lower() in text_blob.lower()
            ]

            if not matched_keywords:
                continue

            channel_username = channel.get("username")
            channel_title = channel.get("title") or channel_username or "Telegram source"
            channel_link = channel.get("link") or (
                f"https://t.me/{channel_username}" if channel_username else None
            )

            evidence_urls = [
                m.get("link")
                for m in messages
                if m.get("link")
            ]

            excerpt = text_blob[:2000]

            source = normalize_source(
                source_type="telegram",
                source_name=channel_title,
                source_url=channel_link,
                evidence_urls=evidence_urls[:10],
                telegram_links=[channel_link] if channel_link else [],
                raw_excerpt=excerpt,
                metadata={
                    "username": channel_username,
                    "title": channel_title,
                    "member_count": channel.get("member_count", 0),
                    "participants_count": channel.get("participants_count", 0),
                    "matched_keywords": matched_keywords,
                    "messages": messages[:10],
                },
            )

            results.append(
                {
                    "source": "telegram_public",
                    "source_type": "telegram",
                    "title": f"Telegram OSINT match: {channel_title}",
                    "url": channel_link,
                    "text": excerpt,
                    "matched_keywords": matched_keywords,
                    "first_seen": source["first_seen"],
                    "source_data": source,
                    "metadata": source["metadata"],
                }
            )

        return results


telegram_source_connector = TelegramSourceConnector()