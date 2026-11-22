import time
from typing import Any
import logging

log = logging.getLogger(__name__)
_time_lookup: dict[str, float] = dict()


def is_stale(type_of_event: str, threshold: float) -> bool:
    now = time.monotonic()
    last = _time_lookup.get(type_of_event)
    return last is None or now - last > threshold


def mark_refreshed(type_of_event: str) -> None:
    _time_lookup[type_of_event] = time.monotonic()


def shorten_data_structure(data_structure: list[Any] | dict[str, Any], limit: int = 10):
    """Keep only the first ``limit`` entries, so a huge payload stays readable."""
    if isinstance(data_structure, list):
        if len(data_structure) > limit:
            log.info("[Backend Shortening Data Structure] Kept %s of %s entries.", limit, len(data_structure))
            return data_structure[:limit]
    return data_structure
