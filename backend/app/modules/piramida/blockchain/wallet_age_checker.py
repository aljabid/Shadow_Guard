from app.modules.shared.blockchain.tron_client import tron_client
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def check_wallet_age(address: str) -> dict:
    txs = await tron_client.get_account_transactions(address, limit=200)
    if not txs:
        return {"address": address, "age_days": None, "is_new_wallet": True, "first_tx": None}
    timestamps = [tx.get("block_timestamp", 0) for tx in txs if tx.get("block_timestamp")]
    if not timestamps:
        return {"address": address, "age_days": None, "is_new_wallet": True, "first_tx": None}
    oldest_ts = min(timestamps) / 1000
    first_tx_dt = datetime.utcfromtimestamp(oldest_ts)
    age_days = (datetime.utcnow() - first_tx_dt).days
    return {"address": address, "age_days": age_days, "is_new_wallet": age_days < 30, "first_tx": first_tx_dt.isoformat()}
