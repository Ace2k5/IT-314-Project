import logging
import httpx
import json
from pprint import pprint

log = logging.getLogger(__name__)


import json
from pathlib import Path
GEOJSON_PATH = Path(__file__).parent.parent.parent / "externals" / "ph_evacs_cleaned.geojson"

def check_table(database):
    database.cursor.execute("SELECT * FROM Shelters")
    rows = database.cursor.fetchall()
    if rows is None or len(rows) == 0:
        log.info("Shelters Table does not exist, creating and populating Shelters table...")
        ingest(database)
    else:
        log.info("Shelters Table already exists.")
        return

def ingest(database):
    database.cursor.executescript("""
        CREATE TABLE IF NOT EXISTS Shelters (
            id INTEGER PRIMARY KEY,
            name TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            type TEXT,
            address TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_shelters_lat_lon ON Shelters(lat, lon);
    """)

    with open(GEOJSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    rows = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        geom = feature.get("geometry", {})

        # GeoJSON geometry can be Point, Polygon, etc.
        # For Point: coordinates = [lon, lat]
        # For Polygon: take the first coordinate of the exterior ring
        coords = geom.get("coordinates")
        if not coords:
            continue

        if geom.get("type") == "Point":
            lon, lat = coords[0], coords[1]
        elif geom.get("type") in ("Polygon", "MultiPolygon"):
            # Take the first ring's first point as a representative coordinate
            try:
                if geom["type"] == "Polygon":
                    lon, lat = coords[0][0][0], coords[0][0][1]
                else:  # MultiPolygon
                    lon, lat = coords[0][0][0][0], coords[0][0][0][1]
            except (IndexError, TypeError):
                continue
        else:
            continue

        # Build a readable address from the location fields
        addr_parts = [
            props.get("place"),
            props.get("city") or props.get("municipality"),
            props.get("province"),
        ]
        address = ", ".join(p for p in addr_parts if p) or None

        rows.append((
            props.get("id"),
            props.get("name") or "Unnamed evacuation center",
            lat, lon,
            props.get("type") or "Evacuation Center",
            address,
        ))

    database.cursor.executemany("""
        INSERT INTO shelters (id, name, lat, lon, type, address)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name=excluded.name, lat=excluded.lat, lon=excluded.lon,
          type=excluded.type, address=excluded.address
    """, rows)
    database.connection.commit()
    log.info("Loaded %s shelters into SQL", len(rows))
    database.connection.close()
    
if __name__ == "__main__":
    print(Path(__file__).parent.parent.parent / "externals" / "ph_evacs_cleaned.geojson")