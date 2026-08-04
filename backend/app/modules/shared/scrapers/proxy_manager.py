import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ProxyManager:
    def __init__(self):
        self.tor_socks_host = "127.0.0.1"
        self.tor_socks_port = 9050
        self._tor_available = False

    async def check_tor(self) -> bool:
        try:
            import httpx
            proxies = {
                "http://": f"socks5://{self.tor_socks_host}:{self.tor_socks_port}",
                "https://": f"socks5://{self.tor_socks_host}:{self.tor_socks_port}",
            }
            async with httpx.AsyncClient(proxies=proxies, timeout=10) as client:
                resp = await client.get("https://check.torproject.org/api/ip")
                self._tor_available = resp.json().get("IsTor", False)
                return self._tor_available
        except Exception as e:
            logger.warning(f"Tor not available: {e}")
            self._tor_available = False
            return False

    def get_tor_proxies(self) -> Optional[dict]:
        if not self._tor_available:
            return None
        return {
            "http://": f"socks5://{self.tor_socks_host}:{self.tor_socks_port}",
            "https://": f"socks5://{self.tor_socks_host}:{self.tor_socks_port}",
        }


proxy_manager = ProxyManager()
