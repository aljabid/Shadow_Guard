from datetime import datetime
from typing import List
import httpx

from app.services.sources.source_normalizer import normalize_source


class GitHubOSINTScraper:
    async def collect(self, keywords: List[str], limit: int = 10) -> list:
        findings = []

        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "ShadowGuard-OSINT/1.0",
        }

        async with httpx.AsyncClient(
            timeout=15,
            follow_redirects=True,
            headers=headers,
        ) as client:

            for keyword in keywords[:8]:

                try:
                    response = await client.get(
                        "https://api.github.com/search/repositories",
                        params={
                            "q": keyword,
                            "sort": "updated",
                            "order": "desc",
                            "per_page": 5,
                        },
                    )

                    if response.status_code != 200:
                        continue

                    data = response.json()

                    for repo in data.get("items", []):

                        repo_name = repo.get("full_name", "")
                        repo_url = repo.get("html_url", "")
                        description = repo.get("description") or ""

                        source = normalize_source(
                            source_type="github",
                            source_name=repo_name,
                            source_url=repo_url,
                            github_links=[repo_url],
                            raw_excerpt=description,
                            metadata={
                                "stars": repo.get("stargazers_count", 0),
                                "language": repo.get("language"),
                                "updated_at": repo.get("updated_at"),
                                "keyword": keyword,
                            },
                        )

                        findings.append(
                            {
                                "source": "github_public",
                                "source_type": "github",
                                "title": f"GitHub repository match: {repo_name}",
                                "url": repo_url,
                                "text": description,
                                "matched_keywords": [keyword],
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


github_osint_scraper = GitHubOSINTScraper()