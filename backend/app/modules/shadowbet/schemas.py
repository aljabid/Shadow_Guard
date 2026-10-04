from pydantic import BaseModel
from typing import List, Optional


class ShadowBetScanInput(BaseModel):
    seed_channels: Optional[List[str]] = None
    platforms_to_check: Optional[List[str]] = None
    max_channels: int = 50
    include_influencer_map: bool = True
    demo_mode: bool = False
