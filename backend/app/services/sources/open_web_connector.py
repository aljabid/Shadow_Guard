from typing import List, Dict, Any
import re
import html
import httpx

from app.services.sources.source_normalizer import normalize_source


def clean_html(raw_html: str, max_length: int = 2000) -> str:
    if not raw_html:
        return ""

    text = re.sub(r"<script[\s\S]*?</script>", " ", raw_html, flags=re.I)
    text = re.sub(r"<style[\s\S]*?</style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()

    return text[:max_length]


class OpenWebConnector:
    async def collect(
        self,
        urls: List[str],
        keywords: List[str],
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        from app.services.collector_status import collector_status as _cs
        _cs.mark_enabled("open_web")
        _cs.mark_ready("open_web")

        findings = []
        errors: List[str] = []

        async with httpx.AsyncClient(
            timeout=12,
            follow_redirects=True,
            headers={
                "User-Agent": "ShadowGuard-OSINT/1.0 AFM-Hackathon"
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
                        source_type="public_web",
                        source_name=url,
                        source_url=url,
                        evidence_urls=[url],
                        web_links=[url],
                        raw_excerpt=clean_html(raw_text, max_length=1000),
                        metadata={
                            "status_code": response.status_code,
                            "matched_keywords": matched_keywords,
                            "content_length": len(raw_text),
                        },
                    )

                    findings.append(
                        {
                            "source": "open_web",
                            "source_type": "public_web",
                            "title": f"Public OSINT keyword match: {url}",
                            "url": url,
                            "text": clean_text,
                            "matched_keywords": matched_keywords,
                            "source_data": source,
                            "metadata": source["metadata"],
                            "first_seen": source["first_seen"],
                        }
                    )

                except Exception as exc:
                    errors.append(f"{url}: {exc}")
                    continue

        _cs.add_items("open_web", len(findings))
        if errors and not findings:
            _cs.mark_error("open_web", errors[0])

        return findings


open_web_connector = OpenWebConnector()