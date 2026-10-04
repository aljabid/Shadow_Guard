import os
import re
from datetime import datetime
from typing import Dict, List
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup


DEFAULT_TIMEOUT = 15


def _get_env_list(name: str) -> List[str]:
    value = os.getenv(name, "")
    return [item.strip() for item in value.split(",") if item.strip()]


def _clean_text(value: str) -> str:
    value = re.sub(r"\s+", " ", value or "")
    return value.strip()


def _safe_title(soup: BeautifulSoup, url: str) -> str:
    if soup.title and soup.title.string:
        return _clean_text(soup.title.string)

    parsed = urlparse(url)
    return parsed.netloc or url


def _extract_page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg"]):
        tag.decompose()

    return _clean_text(soup.get_text(" "))


class WebContrabandCollector:
    """
    Real open-web collector for CONTRABAND-KZ.

    Configure with .env:

    CONTRABAND_WEB_URLS=https://example.com/page1,https://example.com/page2
    CONTRABAND_WEB_KEYWORDS=вейп,elfbar,клад,алкоголь оптом
    """

    def __init__(self, input_data: Dict | None = None):
        self.input_data = input_data or {}

        self.urls = _get_env_list("CONTRABAND_WEB_URLS")
        self.keywords = _get_env_list("CONTRABAND_WEB_KEYWORDS")

        self.urls.extend(self.input_data.get("web_urls") or [])
        self.keywords.extend(self.input_data.get("web_keywords") or [])

        self.urls = list(dict.fromkeys(self.urls))
        self.keywords = list(dict.fromkeys(self.keywords))

    async def collect(self) -> List[Dict]:
        max_urls = int(self.input_data.get("max_web_urls", 20) or 20)

        if not self.urls:
            return []

        collected: List[Dict] = []

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/120 Safari/537.36"
            )
        }

        async with httpx.AsyncClient(
            timeout=DEFAULT_TIMEOUT,
            follow_redirects=True,
            headers=headers,
        ) as client:
            for url in self.urls[:max_urls]:
                try:
                    response = await client.get(url)

                    content_type = response.headers.get("content-type", "")

                    if response.status_code >= 400:
                        continue

                    if "text/html" not in content_type and "text/plain" not in content_type:
                        continue

                    html = response.text
                    soup = BeautifulSoup(html, "html.parser")

                    title = _safe_title(soup, url)
                    text = _extract_page_text(html)

                    if not text:
                        continue

                    if self.keywords:
                        lower = text.lower()
                        title_lower = title.lower()

                        if not any(
                            keyword.lower() in lower or keyword.lower() in title_lower
                            for keyword in self.keywords
                        ):
                            continue

                    collected.append(
                        {
                            "source_type": "public_web",
                            "source_name": urlparse(url).netloc or "public_web",
                            "source_url": url,
                            "title": title,
                            "text": text[:8000],
                            "language": None,
                            "collected_at": datetime.utcnow().isoformat(),
                            "metadata": {
                                "collector": "web_collector",
                                "collection_mode": "real_open_web",
                                "status_code": response.status_code,
                                "content_type": content_type,
                                "keywords": self.keywords,
                            },
                        }
                    )

                except Exception as e:
                    collected.append(
                        {
                            "source_type": "public_web",
                            "source_name": urlparse(url).netloc or "public_web",
                            "source_url": url,
                            "title": f"Web collection error: {url}",
                            "text": str(e),
                            "language": None,
                            "collected_at": datetime.utcnow().isoformat(),
                            "metadata": {
                                "collector": "web_collector",
                                "error": type(e).__name__,
                            },
                        }
                    )

        return collected


async def collect_web_sources(input_data: Dict | None = None) -> List[Dict]:
    collector = WebContrabandCollector(input_data=input_data)
    return await collector.collect()