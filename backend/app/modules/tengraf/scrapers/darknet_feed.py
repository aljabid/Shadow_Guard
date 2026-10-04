"""
TENGRAF DarkNet Feed — real OSINT/DarkNet collection pipeline.
Sources: Telegram, open web (OSINT URLs), Reddit, GitHub, search engine,
paste sites (paste_scraper), and Tor .onion nodes (tor_connector).
All hardcoded demo stubs have been replaced with live collectors.
"""

from datetime import datetime
from typing import List, Optional

from app.services.sources.telegram_connector import telegram_source_connector
from app.services.sources.open_web_connector import open_web_connector
from app.services.sources.search_connector import search_connector
from app.services.sources.tor_connector import tor_connector
from app.services.sources.paste_scraper import paste_site_scraper
from app.modules.tengraf.scrapers.reddit_osint import reddit_osint_scraper
from app.modules.tengraf.scrapers.github_osint import github_osint_scraper
from app.services.sources.source_normalizer import normalize_source
from app.modules.tengraf.config import (
    ONION_SEED_URLS,
    PUBLIC_OSINT_URLS,
    TELEGRAM_SEEDS,
)


class DarknetFeed:
    async def collect(
        self,
        keywords: Optional[List[str]] = None,
        max_items: int = 20,
    ) -> list:
        keywords = keywords or []
        findings = []

        # 1. Paste sites — KZ leak / credential dump detection
        paste_results = await paste_site_scraper.collect(
            keywords=keywords,
            limit=8,
        )
        findings.extend(paste_results)

        # 2. Open web — KZ government, financial regulator OSINT
        findings.extend(
            await open_web_connector.collect(
                urls=PUBLIC_OSINT_URLS,
                keywords=keywords,
                limit=8,
            )
        )

        # 3. Telegram — seed channels for dropper/contraband/betting signals
        findings.extend(
            await telegram_source_connector.collect(
                seeds=TELEGRAM_SEEDS,
                keywords=keywords,
                limit=8,
                message_limit=20,
            )
        )

        # 4. Reddit — OSINT communities (r/OSINT, r/netsec, r/privacy)
        findings.extend(
            await reddit_osint_scraper.collect(
                keywords=keywords,
                limit=6,
            )
        )

        # 5. GitHub — exposed credentials, API keys, KZ-related secrets
        findings.extend(
            await github_osint_scraper.collect(
                keywords=keywords,
                limit=5,
            )
        )

        # 6. Search engine — Google/Bing OSINT queries for KZ threats
        findings.extend(
            await search_connector.collect(
                keywords=keywords,
                limit=5,
            )
        )

        # 7. Tor .onion nodes — requires Tor running at socks5://127.0.0.1:9050
        if ONION_SEED_URLS:
            findings.extend(
                await tor_connector.collect(
                    onion_urls=ONION_SEED_URLS,
                    keywords=keywords,
                    limit=5,
                )
            )

        return findings[:max_items]


darknet_feed = DarknetFeed()
