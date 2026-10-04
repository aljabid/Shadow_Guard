from typing import Optional

import httpx


class TorClient:
    """
    Simple Tor-compatible HTTP client.

    Requires Tor running locally:

        tor
        127.0.0.1:9050

    or

        Tor Browser
        127.0.0.1:9150

    """

    def __init__(
        self,
        proxy_url: str = "socks5://127.0.0.1:9050",
        timeout: int = 30,
    ):
        self.proxy_url = proxy_url
        self.timeout = timeout

    async def get(
        self,
        url: str,
        headers: Optional[dict] = None,
    ) -> str:
        async with httpx.AsyncClient(
            proxy=self.proxy_url,
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.get(
                url,
                headers=headers,
            )

            response.raise_for_status()

            return response.text

    async def head(
        self,
        url: str,
        headers: Optional[dict] = None,
    ) -> int:
        async with httpx.AsyncClient(
            proxy=self.proxy_url,
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            response = await client.head(
                url,
                headers=headers,
            )

            return response.status_code

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(
                proxy=self.proxy_url,
                timeout=10,
            ) as client:
                response = await client.get(
                    "https://check.torproject.org/"
                )

                return response.status_code == 200

        except Exception:
            return False


tor_client = TorClient()