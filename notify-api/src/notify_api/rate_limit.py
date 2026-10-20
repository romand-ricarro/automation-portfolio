"""In-memory token-bucket rate limiter, one bucket per API key.

Good for a single process. Behind several workers, move the buckets to Redis.
"""

import math
import threading
import time
from collections.abc import Callable
from dataclasses import dataclass


@dataclass
class Decision:
    allowed: bool
    limit: int
    remaining: int
    retry_after: int  # seconds until the next request would be allowed


class RateLimiter:
    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._clock = clock
        self._buckets: dict[str, tuple[float, float]] = {}  # key -> (tokens, last_refill)
        self._lock = threading.Lock()

    def check(self, key: str, limit_per_minute: int) -> Decision:
        rate = limit_per_minute / 60.0
        now = self._clock()
        with self._lock:
            tokens, last = self._buckets.get(key, (float(limit_per_minute), now))
            tokens = min(float(limit_per_minute), tokens + (now - last) * rate)
            if tokens >= 1:
                tokens -= 1
                self._buckets[key] = (tokens, now)
                return Decision(True, limit_per_minute, int(tokens), 0)
            self._buckets[key] = (tokens, now)
            return Decision(False, limit_per_minute, 0, math.ceil((1 - tokens) / rate))
