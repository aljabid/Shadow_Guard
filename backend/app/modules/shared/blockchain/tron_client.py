import httpx
from typing import Optional, List
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)
TRONGRID_BASE = "https://api.trongrid.io"


class TronClient:
    def __init__(self):
        self.base_url = TRONGRID_BASE

    def _get_api_key(self) -> str:
        try:
            from app.services.api_key_loader import api_key_loader
            return api_key_loader.trongrid_key()
        except Exception:
            return settings.TRONGRID_API_KEY or ""

    def _get_headers(self) -> dict:
        key = self._get_api_key()
        return {"TRON-PRO-API-KEY": key} if key else {}

    async def get_account_transactions(self, address: str, limit: int = 50) -> List[dict]:
        from app.services.collector_status import collector_status as _cs
        _cs.mark_enabled("crypto")

        if not self._get_api_key():
            _cs.mark_not_ready(
                "crypto",
                "TronGrid API key not configured. "
                "Set it in Settings → API Integrations → TronGrid — TRON Blockchain.",
            )
            return []

        _cs.mark_ready("crypto")
        url = f"{self.base_url}/v1/accounts/{address}/transactions/trc20"
        params = {"limit": limit, "only_confirmed": True}
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(url, headers=self._get_headers(), params=params)
                resp.raise_for_status()
                data = resp.json().get("data", [])
                _cs.add_items("crypto", len(data))
                return data
            except Exception as e:
                _cs.mark_error("crypto", f"TronGrid {address}: {e}")
                logger.error(f"TronGrid error for {address}: {e}")
                return []

    async def get_usdt_balance(self, address: str) -> float:
        url = f"{self.base_url}/v1/accounts/{address}"
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                resp = await client.get(url, headers=self._get_headers())
                data = resp.json().get("data", [])
                if data:
                    for token in data[0].get("trc20", []):
                        for contract, balance in token.items():
                            if "TR7NHq" in contract:
                                return int(balance) / 1_000_000
            except Exception as e:
                logger.error(f"USDT balance error: {e}")
        return 0.0

    async def get_transaction_history_volume(self, address: str, days: int = 7) -> dict:
        txs = await self.get_account_transactions(address, limit=200)
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(days=days)
        inflow = 0.0
        outflow = 0.0
        count = 0
        for tx in txs:
            try:
                ts = tx.get("block_timestamp", 0) / 1000
                tx_time = datetime.utcfromtimestamp(ts)
                if tx_time < cutoff:
                    continue
                value = int(tx.get("value", 0)) / 1_000_000
                if tx.get("to") == address:
                    inflow += value
                else:
                    outflow += value
                count += 1
            except Exception:
                pass
        return {"inflow": inflow, "outflow": outflow, "tx_count": count}


tron_client = TronClient()
