from app.modules.shared.blockchain.tron_client import tron_client
from typing import List
import logging

logger = logging.getLogger(__name__)


async def analyze_inflow_pattern(addresses: List[str]) -> dict:
    if not addresses:
        return {"total_inflow_usdt": 0.0, "pattern": "no_wallets", "is_suspicious": False}
    total_inflow = 0.0
    wallet_results = []
    for address in addresses[:5]:
        try:
            volume = await tron_client.get_transaction_history_volume(address, days=30)
            total_inflow += volume.get("inflow", 0)
            wallet_results.append({"address": address, "inflow": volume.get("inflow", 0),
                                   "outflow": volume.get("outflow", 0), "tx_count": volume.get("tx_count", 0)})
        except Exception as e:
            logger.error(f"Inflow analysis error for {address}: {e}")
    many_small = all(
        w.get("tx_count", 0) > 20 and w.get("inflow", 0) / max(w.get("tx_count", 1), 1) < 1000
        for w in wallet_results if w.get("tx_count", 0) > 0
    )
    pattern = "many_small_inflows" if many_small else "normal"
    return {
        "total_inflow_usdt": round(total_inflow, 2), "wallet_count": len(wallet_results),
        "wallet_results": wallet_results, "pattern": pattern,
        "is_suspicious": total_inflow > 10000 and many_small,
    }
