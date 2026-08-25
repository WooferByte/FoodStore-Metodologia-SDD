"""
Centralized system clock for timestamps.

All timestamps in the application MUST be generated as timezone-aware UTC.
This helper is the single source of truth for "now" — replacing the
deprecated datetime.utcnow() everywhere.
"""
from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current UTC time as a timezone-aware datetime."""
    return datetime.now(timezone.utc)
