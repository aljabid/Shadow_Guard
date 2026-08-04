import httpx
import socket
import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def resolve_ip(domain: str) -> Optional[str]:
    try:
        return socket.gethostbyname(domain)
    except Exception as e:
        logger.error(f"IP resolution error for {domain}: {e}")
        return None


async def get_ip_info(ip: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"https://ipinfo.io/{ip}/json")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.error(f"IP info error for {ip}: {e}")
    return {"ip": ip}


def group_by_ip_block(ip_list: list) -> dict:
    blocks = {}
    for ip in ip_list:
        if ip:
            block = ".".join(ip.split(".")[:3])
            blocks.setdefault(block, []).append(ip)
    return {k: v for k, v in blocks.items() if len(v) >= 2}
