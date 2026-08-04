from app.services.telegram.discovery_service import telegram_discovery_service


class ChannelSearcher:
    async def discover_channels(self, seeds, max_channels: int = 20):
        channels = await telegram_discovery_service.discover_public_channels(
            seeds=seeds,
            limit=max_channels,
            include_messages=False,
        )

        return [
            {
                "username": ch.get("username"),
                "title": ch.get("title"),
                "link": ch.get("link"),
                "member_count": ch.get("member_count", 0),
                "description": ch.get("description", ""),
                "is_public": ch.get("is_public", True),
            }
            for ch in channels
        ]


channel_searcher = ChannelSearcher()