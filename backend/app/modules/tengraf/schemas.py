from pydantic import BaseModel
from typing import Optional, List


class TengrafScanInput(BaseModel):
    demo_mode: bool = False
    playback_mode: bool = False
    keywords: Optional[List[str]] = None
    max_items: int = 20