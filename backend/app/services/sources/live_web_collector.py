from typing import List, Dict, Any
import re
import html
import httpx

from app.services.sources.source_normalizer import normalize_source


def clean_html(raw_html: str, max_length: int = 3000) -> str:
    if not raw_html:
        return ""

    text = re.sub(r"<script[\s\S]*?</script>", " ", raw_html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()

    return text[:max_length]


class LiveWebCollector:
    async def collect(
        self,
        urls: List[str],
        keywords: List[str],
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        findings = []

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers={
                "User-Agent": "ShadowGuard-LiveWeb/1.0 AFM-Hackathon"
            },
        ) as client:
            for url in urls[:limit]:
                try:
                    response = await client.get(url)
                    raw_text = response.text or ""
                    clean_text = clean_html(raw_text, max_length=5000)

                    matched_keywords = [
                        kw for kw in keywords if kw.lower() in clean_text.lower()
                    ]

                    if not matched_keywords:
                        continue

                    source = normalize_source(
                        source_type="live_web",
                        source_name=url,
                        source_url=url,
                        evidence_urls=[url],
                        web_links=[url],
                        raw_excerpt=clean_text[:1500],
                        metadata={
                            "collector": "live_web",
                            "status_code": response.status_code,
                            "matched_keywords": matched_keywords,
                            "content_length": len(raw_text),
                        },
                    )

                    findings.append(
                        {
                            "source": "live_web",
                            "source_type": "live_web",
                            "title": f"Live web match: {url}",
                            "url": url,
                            "text": clean_text,
                            "matched_keywords": matched_keywords,
                            "source_data": source,
                            "metadata": source["metadata"],
                            "first_seen": source["first_seen"],
                        }
                    )

                except Exception as e:
                    findings.append(
                        {
                            "source": "live_web_error",
                            "source_type": "live_web",
                            "title": f"Live web collection failed: {url}",
                            "url": url,
                            "text": str(e),
                            "matched_keywords": [],
                            "metadata": {
                                "collector": "live_web",
                                "error": str(e),
                            },
                        }
                    )

        return findings


live_web_collector = LiveWebCollector()