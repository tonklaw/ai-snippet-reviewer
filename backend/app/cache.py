import hashlib
import json
import logging

import redis.asyncio as redis
from cachetools import TTLCache

from app.config import Settings

logger = logging.getLogger(__name__)


def cache_key(*parts: object) -> str:
    # Use hash of JSON to avoid long keys
    raw = json.dumps(parts, sort_keys=True, default=str)
    return "review:" + hashlib.sha256(raw.encode()).hexdigest()


class MemoryCache:
    # In-memory cache
    def __init__(self, ttl_s: int, max_items: int = 1000):
        self._data: TTLCache[str, str] = TTLCache(maxsize=max_items, ttl=ttl_s)

    async def get(self, key: str) -> str | None:
        return self._data.get(key)

    async def set(self, key: str, value: str) -> None:
        self._data[key] = value


class RedisCache:
    def __init__(self, client: redis.Redis, ttl_s: int):
        self._client = client
        self._ttl_s = ttl_s

    async def get(self, key: str) -> str | None:
        try:
            value = await self._client.get(key)
        except redis.RedisError:
            return None
        return value.decode() if isinstance(value, bytes) else value

    async def set(self, key: str, value: str) -> None:
        try:
            await self._client.set(key, value, ex=self._ttl_s)
        except redis.RedisError:
            logger.warning("Failed to set cache key %s in Redis", key, exc_info=True)


def make_cache(settings: Settings) -> MemoryCache | RedisCache:
    if settings.cache_backend == "redis":
        client = redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1)
        return RedisCache(client, settings.cache_ttl_s)
    return MemoryCache(settings.cache_ttl_s)
