from pydantic import BaseModel
from typing import List, Optional


class DroperScanInput(BaseModel):
    seed_channels: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    max_channels: int = 50
    include_graph: bool = True
    demo_mode: bool = False
