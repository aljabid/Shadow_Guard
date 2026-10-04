from typing import List
from app.modules.shared.blockchain.tron_client import tron_client
import logging

logger = logging.getLogger(__name__)


async def analyze_gambling_flows(wallet_addresses: List[str]) -> dict:
    if not wallet_addresses:
        return {"total_inflow_usdt": 0.0, "estimated_weekly_volume": 0.0, "payment_pattern": "no_data"}
    total_inflow = 0.0
    wallet_results = []
    for address in wallet_addresses[:5]:
        try:
            volume = await tron_client.get_transaction_history_volume(address, days=7)
            total_inflow += volume.get("inflow", 0)
            wallet_results.append({"address": address, "weekly_inflow": volume.get("inflow", 0),
                                   "weekly_outflow": volume.get("outflow", 0), "tx_count": volume.get("tx_count", 0)})
        except Exception as e:
            logger.error(f"Payment flow error for {address}: {e}")
    return {
        "total_inflow_usdt": round(total_inflow, 2),
        "estimated_weekly_volume_usdt": round(total_inflow, 2),
        "estimated_weekly_volume_kzt": round(total_inflow * 450, 2),
        "wallet_results": wallet_results,
        "payment_pattern": "high_volume" if total_inflow > 50000 else "normal",
    }
