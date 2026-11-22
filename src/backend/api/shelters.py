"""Evacuation centre ingestion.

The Overpass-based extraction produced ``externals/ph_evacs_cleaned.geojson``;
this module loads it into the ``Shelters`` table once, the first time the backend
starts with an empty table.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from backend.sql.db import Database

log = logging.getLogger(__name__)

GEOJSON_PATH = Path(__file__).resolve().parents[2] / "externals" / "ph_evacs_cleaned.geojson"


def _representative_point(geometry: dict[str, Any]) -> tuple[float, float] | None:
    """Return ``(lon, lat)`` for a Point or Polygon geometry."""
    coordinates = geometry.get("coordinates")
    if not coordinates:
        return None

    geometry_type = geometry.get("type")
    try:
        if geometry_type == "Point":
            return float(coordinates[0]), float(coordinates[1])
        if geometry_type == "Polygon":
            lon, lat = coordinates[0][0]
            return float(lon), float(lat)
        if geometry_type == "MultiPolygon":
            lon, lat = coordinates[0][0][0]
            return float(lon), float(lat)
    except (IndexError, TypeError, ValueError):
        return None
    return None


def _build_address(properties: dict[str, Any]) -> str | None:
    parts = [
        properties.get("place"),
        properties.get("city") or properties.get("municipality"),
        properties.get("province"),
    ]
    return ", ".join(part for part in parts if part) or None


def ingest(database: Database) -> None:
    """Read the GeoJSON file and upsert every usable feature into ``Shelters``."""
    with GEOJSON_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    rows: list[tuple[Any, ...]] = []
    for feature in data.get("features", []):
        properties = feature.get("properties", {})
        point = _representative_point(feature.get("geometry", {}))
        if point is None:
            continue
        lon, lat = point

        rows.append((
            properties.get("id"),
            properties.get("name") or "Unnamed evacuation center",
            lat,
            lon,
            properties.get("type") or "Evacuation Center",
            _build_address(properties),
        ))

    database.cursor.executemany("""
        INSERT INTO Shelters (id, name, lat, lon, type, address)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, lat=excluded.lat, lon=excluded.lon,
          type=excluded.type, address=excluded.address
    """, rows)
    database.connection.commit()
    log.info("[Shelters] Loaded %s evacuation centre(s) into SQL.", len(rows))


def check_table(database: Database) -> None:
    """Populate ``Shelters`` when the table is empty, then leave the connection open."""
    database.cursor.execute("SELECT 1 FROM Shelters LIMIT 1")
    if database.cursor.fetchone() is None:
        log.info("[Shelters] Table is empty, ingesting %s ...", GEOJSON_PATH.name)
        ingest(database)
    else:
        log.info("[Shelters] Table already populated.")


def get_shelters(database: Database) -> dict[int, dict[str, Any]] | None:
    cursor = database.connection.cursor()
    cursor.execute("SELECT * FROM Shelters")
    rows = cursor.fetchall()
    if not rows:
        log.info("[Backend Shelters] Evacuation centers does not exist")
        return None
    returned_data: dict[int, dict[str, Any]] = {}
    for row in rows:
        returned_data[row['id']] = {
            "name": row["name"],
            "lat": row["lat"],
            "lon": row["lon"],
            "type": row["type"],
            "address": row["address"],
        }
    return returned_data
