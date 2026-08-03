import os
from collections import defaultdict
from time import time

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from config import AUTH_RATE_LIMIT, OAUTH_RATE_LIMIT, UPLOAD_RATE_LIMIT


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, *args, **kwargs):
        super().__init__(app)
        self._requests = defaultdict(list)

    def _parse_limit(self, value: str) -> tuple[int, float]:
        amount, interval = value.split("/")
        amount = int(amount)
        if interval == "minute":
            return amount, 60.0
        if interval == "hour":
            return amount, 3600.0
        if interval == "second":
            return amount, 1.0
        raise ValueError("Unsupported rate limit interval")

    def _is_limited(self, key: str, limit: str) -> bool:
        now = time()
        window = self._requests[key]
        limit_value, interval = self._parse_limit(limit)
        window[:] = [timestamp for timestamp in window if now - timestamp < interval]
        if len(window) >= limit_value:
            return True
        window.append(now)
        return False

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path.startswith("/health"):
            return await call_next(request)

        if path.startswith("/upload-audio"):
            limit = UPLOAD_RATE_LIMIT
        elif path.startswith("/oauth/") or "/auth/" in path:
            limit = OAUTH_RATE_LIMIT if path.startswith("/oauth/") else AUTH_RATE_LIMIT
        else:
            return await call_next(request)

        client_key = request.client.host if request.client else "unknown"
        if self._is_limited(f"{path}:{client_key}", limit):
            return JSONResponse(status_code=429, content={"detail": "Rate limit exceeded."})

        return await call_next(request)
