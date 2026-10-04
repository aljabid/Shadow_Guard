import ssl
import socket
import asyncio
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def inspect_ssl(domain: str) -> Optional[dict]:
    try:
        context = ssl.create_default_context()
        loop = asyncio.get_event_loop()

        def _get_cert():
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=domain) as ssock:
                    return ssock.getpeercert()

        cert = await loop.run_in_executor(None, _get_cert)
        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))
        return {
            "domain": domain, "issuer": issuer.get("organizationName"),
            "common_name": subject.get("commonName"),
            "not_after": cert.get("notAfter"), "is_valid": True,
        }
    except Exception as e:
        logger.error(f"SSL inspection error for {domain}: {e}")
        return {"domain": domain, "is_valid": False, "error": str(e)}
