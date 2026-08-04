from datetime import datetime
from typing import List
from app.services.telegram.discovery_service import telegram_discovery_service


class TelegramOSINTScraper:
    async def collect(self, keywords: List[str], limit: int = 10) -> list:
        findings = []

        seeds = [
            "easydropz",
            "techdrop",
            "Dropershoper",
            "forcedropofficial",
            "crypto_invest_kz",
            "time_to_invest_channel",
            "mostbet_kz",
            "betwinner_kz",
        ]

        channels = await telegram_discovery_service.discover_public_channels(
            seeds=seeds,
            limit=limit,
            include_messages=True,
            message_limit=20,
        )

        for ch in channels:
            text_blob = " ".join(
                [m.get("text", "") for m in ch.get("messages", [])]
            )

            matched = [
                kw for kw in keywords if kw.lower() in text_blob.lower()
            ]

            if not matched:
                continue

            findings.append(
                {
                    "source": "telegram_public",
                    "source_type": "telegram",
                    "title": f"Telegram OSINT match: {ch.get('title')}",
                    "url": ch.get("link"),
                    "text": text_blob[:5000],
                    "matched_keywords": matched,
                    "first_seen": datetime.utcnow().isoformat(),
                    "metadata": ch,
                }
            )

        return findings


telegram_osint_scraper = TelegramOSINTScraper()