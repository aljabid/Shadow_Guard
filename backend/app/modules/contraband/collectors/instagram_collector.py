import os
import re
from datetime import datetime
from typing import Dict, List

import httpx
from bs4 import BeautifulSoup


def _clean_text(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


class InstagramContrabandCollector:
    """
    Instagram OSINT collector.

    Uses configured public profile URLs.
    No login required.
    """

    def __init__(self, input_data: Dict | None = None):
        self.input_data = input_data or {}

        self.targets = [
            item.strip()
            for item in os.getenv(
                "CONTRABAND_INSTAGRAM_URLS",
                "",
            ).split(",")
            if item.strip()
        ]

    async def collect(self) -> List[Dict]:
        results: List[Dict] = []

        if not self.targets:
            return results

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            )
        }

        async with httpx.AsyncClient(
            timeout=20,
            follow_redirects=True,
            headers=headers,
        ) as client:

            for url in self.targets:
                try:
                    response = await client.get(url)

                    if response.status_code >= 400:
                        continue

                    soup = BeautifulSoup(
                        response.text,
                        "html.parser",
                    )

                    title = (
                        soup.title.string.strip()
                        if soup.title and soup.title.string
                        else url
                    )

                    text = _clean_text(
                        soup.get_text(" ")
                    )[:8000]

                    results.append(
                        {
                            "source_type": "instagram",
                            "source_name": "instagram",
                            "source_url": url,
                            "title": title,
                            "text": text,
                            "collected_at": datetime.utcnow().isoformat(),
                            "metadata": {
                                "collector": "instagram_collector",
                            },
                        }
                    )

                except Exception:
                    continue

        return results


async def collect_instagram_sources(
    input_data: Dict | None = None,
) -> List[Dict]:
    collector = InstagramContrabandCollector(
        input_data=input_data
    )

    return await collector.collect()