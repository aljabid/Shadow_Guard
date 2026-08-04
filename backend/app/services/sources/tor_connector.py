from typing import List, Dict, Any
import httpx

from app.services.sources.source_normalizer import normalize_source


class TorConnector:
    async def collect(
        self,
        onion_urls: List[str],
        keywords: List[str],
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        from app.services.collector_status import collector_status as _cs
        _cs.mark_enabled("darknet")

        findings = []

        if not onion_urls:
            return findings

        try:
            from app.services.api_key_loader import api_key_loader
            proxy_url = api_key_loader.tor_proxy_url() or "socks5://127.0.0.1:9050"
        except Exception:
            proxy_url = "socks5://127.0.0.1:9050"

        errors: List[str] = []

        try:
            async with httpx.AsyncClient(
                timeout=25,
                follow_redirects=True,
                proxy=proxy_url,
                headers={"User-Agent": "ShadowGuard-TorCrawler/1.0"},
            ) as client:
                _cs.mark_ready("darknet")

                for onion_url in onion_urls[:limit]:
                    try:
                        response = await client.get(onion_url)
                        text = response.text

                        matched_keywords = [
                            kw for kw in keywords if kw.lower() in text.lower()
                        ]

                        if not matched_keywords:
                            continue

                        source = normalize_source(
                            source_type="tor_onion",
                            source_name=onion_url,
                            source_url=onion_url,
                            evidence_urls=[onion_url],
                            onion_links=[onion_url],
                            raw_excerpt=text[:2000],
                            metadata={
                                "matched_keywords": matched_keywords,
                                "status_code": response.status_code,
                            },
                        )

                        findings.append({
                            "source": "tor_onion",
                            "source_type": "tor_onion",
                            "title": f"Tor match: {onion_url}",
                            "url": onion_url,
                            "text": text[:5000],
                            "matched_keywords": matched_keywords,
                            "source_data": source,
                            "metadata": source["metadata"],
                            "first_seen": source["first_seen"],
                        })

                    except Exception as exc:
                        errors.append(f"{onion_url}: {exc}")
                        continue

        except Exception as exc:
            # Proxy connection failed (Tor not running / wrong config)
            _cs.mark_not_ready(
                "darknet",
                f"Tor proxy unreachable at {proxy_url}: {exc}. "
                "Configure in Settings → API Integrations → Tor Gateway.",
            )
            return findings

        _cs.add_items("darknet", len(findings))
        if errors and not findings:
            _cs.mark_error("darknet", errors[0])

        return findings


tor_connector = TorConnector()
