from typing import List
from app.modules.shared.blockchain.tron_client import tron_client
from app.modules.shared.scrapers.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)


class WalletMonitor:
    async def monitor_wallets(self, addresses: List[str]) -> dict:
        if not addresses:
            return {"wallets_checked": 0, "total_usdt_balance": 0.0, "outflow_signals": []}
        results = []
        total_balance = 0.0
        outflow_signals = []
        for address in addresses:
            await rate_limiter.trongrid()
            balance = await tron_client.get_usdt_balance(address)
            volume = await tron_client.get_transaction_history_volume(address, days=7)
            total_balance += balance
            result = {
                "address": address, "usdt_balance": balance,
                "7d_inflow": volume["inflow"], "7d_outflow": volume["outflow"],
                "7d_tx_count": volume["tx_count"],
            }
            if volume["outflow"] > volume["inflow"] * 3 and volume["outflow"] > 1000:
                result["outflow_signal"] = True
                outflow_signals.append({
                    "address": address, "outflow": volume["outflow"], "inflow": volume["inflow"],
                    "ratio": round(volume["outflow"] / max(volume["inflow"], 0.01), 2),
                })
            else:
                result["outflow_signal"] = False
            results.append(result)
        return {
            "wallets_checked": len(addresses),
            "wallet_results": results,
            "total_usdt_balance": round(total_balance, 2),
            "outflow_signals": outflow_signals,
        }


wallet_monitor = WalletMonitor()
