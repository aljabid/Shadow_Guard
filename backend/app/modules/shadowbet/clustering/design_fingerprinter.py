import httpx
import re
from hashlib import md5
from typing import Optional
import logging

logger = logging.getLogger(__name__)


async def get_page_fingerprint(domain: str) -> Optional[dict]:
    url = f"https://{domain}"
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            html = resp.text[:20000]
            css_classes = set(re.findall(r'class="([^"]+)"', html))
            structure_hash = md5("".join(sorted(list(css_classes)[:20])).encode()).hexdigest()[:8]
            return {"domain": domain, "structure_hash": structure_hash,
                    "css_class_count": len(css_classes)}
    except Exception as e:
        logger.error(f"Fingerprint error for {domain}: {e}")
        return None


def find_similar_domains(fingerprints: list) -> list:
    groups = {}
    for fp in fingerprints:
        if fp and fp.get("structure_hash"):
            h = fp["structure_hash"]
            groups.setdefault(h, []).append(fp["domain"])
    return [{"hash": h, "domains": domains} for h, domains in groups.items() if len(domains) >= 2]
