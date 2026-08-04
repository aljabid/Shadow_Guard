import httpx
from typing import List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
ETHERSCAN_BASE = "https://api.etherscan.io/api"


class EthClient:
    def _get_api_key(self) -> str:
        try:
            from app.services.api_key_loader import api_key_loader
            return api_key_loader.etherscan_key()
        except Exception:
            return settings.ETHERSCAN_API_KEY or "YourApiKeyToken"

    async def get_transactions(self, address: str, limit: int = 50) -> List[dict]:
        from app.services.collector_status import collector_status as _cs
        _cs.mark_enabled("crypto")

        api_key = self._get_api_key()
        if not api_key or api_key == "YourApiKeyToken":
            _cs.mark_not_ready(
                "crypto",
                "Etherscan API key not configured. "
                "Set it in Settings → API Integrations → Etherscan — Ethereum.",
            )
            return []

        _cs.mark_ready("crypto")
        params = {
            "module": "account", "action": "txlist", "address": address,
            "startblock": 0, "endblock": 99999999, "sort": "desc",
            "offset": limit, "page": 1, "apikey": api_key,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(ETHERSCAN_BASE, params=params)
                data = resp.json()
                if data.get("status") == "1":
                    txs = data.get("result", [])
                    _cs.add_items("crypto", len(txs))
                    return txs
                else:
                    msg = data.get("message") or data.get("result") or "unknown error"
                    _cs.mark_error("crypto", f"Etherscan {address}: {msg}")
            except Exception as e:
                _cs.mark_error("crypto", f"Etherscan {address}: {e}")
                logger.error(f"Etherscan error for {address}: {e}")
        return []

    async def get_eth_balance(self, address: str) -> float:
        params = {
            "module": "account", "action": "balance", "address": address,
            "tag": "latest", "apikey": self._get_api_key(),
        }
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(ETHERSCAN_BASE, params=params)
                data = resp.json()
                if data.get("status") == "1":
                    return int(data["result"]) / 1e18
            except Exception as e:
                logger.error(f"ETH balance error: {e}")
        return 0.0


eth_client = EthClient()
