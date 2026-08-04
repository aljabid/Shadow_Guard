from typing import List, Dict, Any
import os
import httpx

from app.services.sources.source_normalizer import normalize_source


class SearchConnector:
    async def collect(
        self,
        keywords: List[str],
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        api_key = os.getenv("BRAVE_SEARCH_API_KEY")

        if not api_key:
            return []

        findings = []

        headers = {
            "Accept": "application/json",
            "X-Subscription-Token": api_key,
            "User-Agent": "ShadowGuard-OSINT/1.0 AFM-Hackathon",
        }

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=headers,
        ) as client:
            for keyword in keywords[:8]:
                try:
                    response = await client.get(
                        "https://api.search.brave.com/res/v1/web/search",
                        params={
                            "q": keyword,
                            "count": 5,
                            "country": "KZ",
                            "search_lang": "en",
                        },
                    )

                    if response.status_code != 200:
                        continue

                    data = response.json()
                    web_results = data.get("web", {}).get("results", [])

                    for item in web_results:
                        title = item.get("title") or ""
                        url = item.get("url") or ""
                        description = item.get("description") or ""

                        text = f"{title}\n{description}"

                        source = normalize_source(
                            source_type="search_engine",
                            source_name="Brave Search",
                            source_url=url,
                            evidence_urls=[url] if url else [],
                            web_links=[url] if url else [],
                            raw_excerpt=text,
                            metadata={
                                "keyword": keyword,
                                "title": title,
                                "description": description,
                            },
                        )

                        findings.append(
                            {
                                "source": "brave_search",
                                "source_type": "search_engine",
                                "title": f"Search result match: {title}",
                                "url": url,
                                "text": text[:5000],
                                "matched_keywords": [keyword],
                                "source_data": source,
                                "metadata": source["metadata"],
                                "first_seen": source["first_seen"],
                            }
                        )

                        if len(findings) >= limit:
                            return findings

                except Exception:
                    continue

        return findings


search_connector = SearchConnector()