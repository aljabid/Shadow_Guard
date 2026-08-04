import time
from collections import defaultdict


class SimpleRateLimiter:
    """
    Lightweight in-memory rate limiter.
    Suitable for collectors and scrapers.
    """

    def __init__(self):
        self.last_request = defaultdict(float)

    def allow(
        self,
        source: str,
        interval_seconds: float = 1.0,
    ) -> bool:
        now = time.time()

        if (
            now - self.last_request[source]
            >= interval_seconds
        ):
            self.last_request[source] = now
            return True

        return False

    def wait(
        self,
        source: str,
        interval_seconds: float = 1.0,
    ):
        now = time.time()

        elapsed = now - self.last_request[source]

        if elapsed < interval_seconds:
            time.sleep(interval_seconds - elapsed)

        self.last_request[source] = time.time()


rate_limiter = SimpleRateLimiter()