from pydantic import BaseModel
from typing import List, Optional


class ExchangeWatchInput(BaseModel):
    exchange_name: Optional[str] = None
    telegram_channels: Optional[List[str]] = None
    wallet_addresses: Optional[List[str]] = None
    domain: Optional[str] = None
    playback_mode: bool = False
    demo_mode: bool = False
