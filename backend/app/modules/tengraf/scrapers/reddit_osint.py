from datetime import datetime
from typing import List
from urllib.parse import quote_plus
import httpx

from app.services.sources.source_normalizer import normalize_source


class RedditOSINTScraper:
    async def collect(self, keywords: List[str], limit: int = 10) -> list:
        findings = []

        headers = {
            "User-Agent": "ShadowGuard-OSINT/1.0 AFM-Hackathon"
        }

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=headers,
        ) as client:
            for keyword in keywords[:8]:
                try:
                    query = quote_plus(keyword)
                    url = f"https://www.reddit.com/search.json?q={query}&limit=5&sort=new"

                    response = await client.get(url)

                    if response.status_code != 200:
                        continue

                    data = response.json()
                    posts = data.get("data", {}).get("children", [])

                    for post in posts:
                        p = post.get("data", {})

                        title = p.get("title") or ""
                        selftext = p.get("selftext") or ""
                        subreddit = p.get("subreddit") or "unknown"
                        permalink = p.get("permalink") or ""
                        author = p.get("author") or "unknown"

                        reddit_url = (
                            f"https://www.reddit.com{permalink}"
                            if permalink
                            else None
                        )

                        text = f"{title}\n{selftext}".strip()

                        if not text:
                            continue

                        matched_keywords = [
                            kw for kw in keywords if kw.lower() in text.lower()
                        ]

                        if not matched_keywords:
                            continue

                        source = normalize_source(
                            source_type="reddit",
                            source_name=f"r/{subreddit}",
                            source_url=reddit_url,
                            evidence_urls=[reddit_url] if reddit_url else [],
                            reddit_links=[reddit_url] if reddit_url else [],
                            raw_excerpt=text,
                            metadata={
                                "subreddit": subreddit,
                                "author": author,
                                "score": p.get("score", 0),
                                "num_comments": p.get("num_comments", 0),
                                "created_utc": p.get("created_utc"),
                                "matched_keywords": matched_keywords,
                            },
                        )

                        findings.append(
                            {
                                "source": "reddit_public",
                                "source_type": "reddit",
                                "title": title[:200],
                                "url": reddit_url,
                                "text": text[:5000],
                                "matched_keywords": matched_keywords,
                                "first_seen": datetime.utcnow().isoformat(),
                                "source_data": source,
                                "metadata": source["metadata"],
                            }
                        )

                        if len(findings) >= limit:
                            return findings

                except Exception:
                    continue

        return findings


reddit_osint_scraper = RedditOSINTScraper()