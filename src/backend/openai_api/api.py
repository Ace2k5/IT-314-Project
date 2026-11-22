"""Persistence helpers for provider credentials.

Not wired into a route yet: ``POST /api/save`` is a stub until user profiles
exist.  Kept so the storage layer is already in place when that lands.
"""

from __future__ import annotations

import logging

from backend.sql.db import Database

log = logging.getLogger(__name__)


def save_credentials(api: str, key: str, database: Database) -> None:
    database.cursor.execute(
        "INSERT OR REPLACE INTO API (api, key) VALUES (?, ?)",
        (api, key),
    )
    database.connection.commit()
    log.info("[Credentials] Stored credentials for %s", api)
