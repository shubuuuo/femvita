import threading
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

MAX_KEYS = 10_000  # cap memory if someone hammers us with endless made-up emails


class Limiter:
    """At most `limit` hits per key in any `window` seconds."""

    def __init__(self, limit: int, window: int):
        self.limit = limit
        self.window = window
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def blocked(self, key: str) -> int:
        """Seconds until this key may try again, or 0 if it may try now."""
        now = time.monotonic()
        with self._lock:
            q = self._hits.get(key)
            if not q:
                return 0
            while q and q[0] <= now - self.window:
                q.popleft()
            if not q:
                del self._hits[key]
                return 0
            return int(q[0] + self.window - now) + 1 if len(q) >= self.limit else 0

    def hit(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            if len(self._hits) >= MAX_KEYS:  # drop keys whose newest hit has expired
                for k in [k for k, q in self._hits.items() if not q or q[-1] <= now - self.window]:
                    del self._hits[k]
            self._hits[key].append(now)

    def reset(self, key: str) -> None:
        with self._lock:
            self._hits.pop(key, None)


def too_many(wait: int) -> HTTPException:
    mins = max(1, round(wait / 60))
    return HTTPException(
        status_code=429,
        detail=f"Too many attempts. Try again in {mins} minute{'' if mins == 1 else 's'}.",
        headers={"Retry-After": str(wait)},
    )


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


# 5 failed logins per email per 15 minutes. This is the real protection.
login_by_email = Limiter(limit=5, window=15 * 60)
# A looser per-IP cap. Behind a proxy the address can be shared or spoofed, so treat it as a soft extra layer.
login_by_ip = Limiter(limit=30, window=15 * 60)
# New accounts per IP per hour
register_by_ip = Limiter(limit=10, window=60 * 60)
# Wrong "current password" when changing the password or deleting the account, per user
password_checks = Limiter(limit=5, window=15 * 60)