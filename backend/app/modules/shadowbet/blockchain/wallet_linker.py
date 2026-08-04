from typing import List
from app.modules.shared.blockchain.tron_client import tron_client
import logging

logger = logging.getLogger(__name__)


async def find_shared_wallets(wallet_groups: List[List[str]]) -> List[dict]:
    all_wallets = [w for group in wallet_groups for w in group]
    counter = {}
    for w in all_wallets:
        counter[w] = counter.get(w, 0) + 1
    return [{"wallet": w, "appears_in_platforms": c, "link_strength": "high" if c >= 3 else "medium"}
            for w, c in counter.items() if c >= 2]


async def trace_common_recipient(wallet_addresses: List[str]) -> List[dict]:
    recipients = {}
    for address in wallet_addresses[:5]:
        try:
            txs = await tron_client.get_account_transactions(address, limit=20)
            for tx in txs:
                to_addr = tx.get("to", "")
                if to_addr and to_addr != address:
                    recipients.setdefault(to_addr, []).append(address)
        except Exception as e:
            logger.error(f"Wallet trace error for {address}: {e}")
    return [{"recipient": addr, "sending_wallets": senders}
            for addr, senders in recipients.items() if len(senders) >= 2]
