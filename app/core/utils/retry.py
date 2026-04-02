from __future__ import annotations

import random
import re

_RETRY_PATTERN = re.compile(r"(?i)try again in\s*(\d+(?:\.\d+)?)\s*(s|ms|seconds?)")
_BACKOFF_INITIAL_DELAY_MS = 200
_BACKOFF_FACTOR = 2.0
_BACKOFF_JITTER_MIN = 0.9
_BACKOFF_JITTER_MAX = 1.1


def parse_retry_after(message: str) -> float | None:
    match = _RETRY_PATTERN.search(message or "")
    if not match:
        return None
    value = float(match.group(1))
    unit = match.group(2).lower()
    if unit == "ms":
        return value / 1000
    return value


def backoff_seconds(attempt: int) -> float:
    if attempt < 1:
        attempt = 1
    exponent = _BACKOFF_FACTOR ** (attempt - 1)
    base_ms = _BACKOFF_INITIAL_DELAY_MS * exponent
    jitter = random.uniform(_BACKOFF_JITTER_MIN, _BACKOFF_JITTER_MAX)
    return (base_ms * jitter) / 1000.0
