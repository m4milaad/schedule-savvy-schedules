from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from time import time
from typing import Generic, TypeVar


T = TypeVar("T")


@dataclass
class CacheItem(Generic[T]):
    value: T
    expires_at: float


class TTLCache(Generic[T]):
    def __init__(self, ttl_seconds: int = 600, max_items: int = 512):
        self.ttl_seconds = ttl_seconds
        self.max_items = max_items
        self._items: OrderedDict[str, CacheItem[T]] = OrderedDict()

    def get(self, key: str) -> T | None:
        item = self._items.get(key)
        if item is None:
            return None
        if item.expires_at <= time():
            self._items.pop(key, None)
            return None
        self._items.move_to_end(key)
        return item.value

    def set(self, key: str, value: T) -> None:
        if key in self._items:
            self._items.pop(key, None)
        self._items[key] = CacheItem(value=value, expires_at=time() + self.ttl_seconds)
        self._items.move_to_end(key)
        while len(self._items) > self.max_items:
            self._items.popitem(last=False)
