"""Shared helper for calling third-party APIs: one HTTP client + an in-memory cache with an expiry time.
Cache lives in this process only (it resets when the server restarts), which is fine for a project this size."""
import logging
import threading
import time
from typing import Any

import httpx
from fastapi import HTTPException

log = logging.getLogger("uvicorn.error")

HOUR = 3600
DAY = 24 * HOUR

_client = httpx.Client(
    timeout=10.0,
    follow_redirects=True,
    headers={"User-Agent": "FemVita/0.1 (student project)"},
)
_cache: dict[str, tuple[float, Any]] = {}
_lock = threading.Lock()
MAX_ENTRIES = 500


def cached_get(url: str, params: dict | None = None, *, ttl: int, as_json: bool = True) -> Any:
    """GET a URL and cache the parsed result for `ttl` seconds. Errors are never cached."""
    key = url + "?" + "&".join(f"{k}={v}" for k, v in sorted((params or {}).items()))
    now = time.monotonic()
    with _lock:
        hit = _cache.get(key)
        if hit and hit[0] > now:
            return hit[1]

    try:
        resp = _client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json() if as_json else resp.text
    except (httpx.HTTPError, ValueError) as exc:
        log.warning("Upstream call failed: %s %s -> %r", url, params, exc)  # shows the real cause in the terminal
        raise HTTPException(status_code=502, detail="The data provider isn't responding right now.")

    with _lock:
        if len(_cache) >= MAX_ENTRIES:  # make room: drop expired entries, then the oldest one
            for k in [k for k, (exp, _) in _cache.items() if exp <= now]:
                del _cache[k]
            if len(_cache) >= MAX_ENTRIES:
                _cache.pop(next(iter(_cache)))
        _cache[key] = (now + ttl, data)
    return data