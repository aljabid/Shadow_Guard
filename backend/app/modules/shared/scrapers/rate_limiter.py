import asyncio
import time
from typing import Dict
from collections import defaultdict


class RateLimiter:
    def __init__(self):
        self._call_times: Dict[str, list] = defaultdict(list)
        self._locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)

    async def acquire(self, key: str, max_calls: int, period: float):
        async with self._locks[key]:
            now = time.monotonic()
            self._call_times[key] = [t for t in self._call_times[key] if now - t < period]
            if len(self._call_times[key]) >= max_calls:
                oldest = self._call_times[key][0]
                sleep_time = period - (now - oldest)
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
            self._call_times[key].append(time.monotonic())

    async def telegram(self):
        await self.acquire("telegram", max_calls=20, period=60.0)

    async def trongrid(self):
        await self.acquire("trongrid", max_calls=15, period=1.0)

    async def etherscan(self):
        await self.acquire("etherscan", max_calls=5, period=1.0)


rate_limiter = RateLimiter()
