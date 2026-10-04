from pydantic import BaseModel
from typing import List, Optional


class PiramidaScanInput(BaseModel):
    seed_channels: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    wallet_addresses: Optional[List[str]] = None
    playback_mode: bool = False
    demo_mode: bool = False
    max_channels: int = 30
