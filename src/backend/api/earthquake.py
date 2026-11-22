import datetime
import math
import logging
import json
from typing import Any

import httpx
from shapely.geometry import MultiPoint

from backend.sql.db import Database

log = logging.getLogger(__name__)


def simplify_coordinate(polygon: list[list[float]]) -> list[list[float]] | None:
    """Return the convex hull of ``polygon``, or None for a degenerate input."""
    if not polygon:
        return None
    hull = MultiPoint([tuple(point) for point in polygon]).convex_hull
    if hull.is_empty or not hasattr(hull, "exterior"):
        return None
    return [list(coordinate) for coordinate in hull.exterior.coords]


def _flatten_to_ring(geom: dict) -> list[list[float]]:
    """Extract every coordinate ring from a GeoJSON geometry as a flat list."""
    t = geom["type"]
    c = geom["coordinates"]

    if t == "Point":
        return [c]

    if t == "Polygon":
        rings: list[list[float]] = []
        for ring in c:
            for pt in ring:
                rings.append(pt)
        log.info("[Backend Earthquake] Polygon normalized: %s", rings)
        return rings

    if t == "MultiPolygon":
        rings: list[list[float]] = []
        for poly in c:
            for ring in poly:
                for pt in ring:
                    rings.append(pt)
        log.info("[Backend Earthquake] MultiPolygon normalized: %s", rings)
        return rings

    raise ValueError(f"Unhandled geometry type: {t}")


def _build_gdacs_url(search_params: dict[str, str]) -> str:
    url = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?"
    query_parts: list[str] = []
    for key, value in search_params.items():
        query_parts.append(f"{key}={value}")
    return f"{url}{'&'.join(query_parts)}"


def _gdacs_search_params(eventlist: str, fromdate: str, todate: str, alertlevel: str) -> dict[str, str]:
    return {
        "eventlist": eventlist,
        "fromdate": fromdate,
        "todate": todate,
        "alertlevel": alertlevel,
    }


def check_earthquake_db(database: Database) -> list[dict[str, Any]] | None:
    log.info("[Earthquake Backend] Checking SQL Database before calling GDACS...")
    cursor = database.connection.cursor()

    cursor.execute("SELECT * FROM Earthquake")
    events = cursor.fetchall()
    result = []
    if events:
        log.info("[Earthquake Backend] Fetched all Earthquake information.")
        for event in events:
            cursor.execute(
                "SELECT intensity, width, height, west, south, east, north, hull "
                "FROM Intensity WHERE eventid = ?",
                (event["eventid"],),
            )
            intensities = [
                {
                    "intensity": row["intensity"],
                    "width":     row["width"],
                    "height":    row["height"],
                    "bbox":      [row["west"], row["south"], row["east"], row["north"]],
                    "hull":      json.loads(row["hull"]) if row["hull"] else None,
                }
                for row in cursor.fetchall()
            ]
            result.append({
                "eventid":      int(event["eventid"]),
                "description":  event["description"],
                "severity":     event["severity"],
                "severitytext": event["severitytext"],
                "alertlevel":   event["alertlevel"],
                "initialdate":  event["initialdate"],
                "enddate":      event["enddate"],
                "intensities":  intensities,
            })
        return result

    log.info("[Earthquake Backend] Earthquake table is empty.")
    return None


def call_gdacs_earthquake(database: Database) -> list[dict[str, Any]]:
    CURRENT_DATE = datetime.datetime.now()
    INITIAL_DATE = CURRENT_DATE.replace(year=1980, month=1, day=1, hour=0, minute=0, second=0)

    def gdacs_extract(gdacs_info: dict[str, Any]) -> list[dict[str, Any]]:
        log.info("[Backend Earthquake] Fetching Earthquake information from GDACS.")
        events: list[dict[str, Any]] = []
        cursor = database.connection.cursor()

        for feature in gdacs_info["features"]:
            props = feature["properties"]

            if props.get("country") != "Philippines":
                continue

            log.info("[Earthquake Backend] Philippines found: %s", props["eventid"])

            geometry_info = httpx.get(
                url=props["url"]["geometry"], timeout=10
            ).json()

            intensities = []
            for geometry in geometry_info["features"]:
                gprops = geometry["properties"]
                if gprops.get("intensity") not in (4, 6, 8):
                    log.info("[Earthquake Backend] Was not in intensities [4,6,8], skipping...")
                    continue

                w, s, e, n = geometry["bbox"]
                mid_lat = math.radians((s + n) / 2)
                raw_polygon = _flatten_to_ring(geometry["geometry"])
                hull = simplify_coordinate(polygon=raw_polygon)
                if hull is None:
                    log.warning("[Earthquake Backend] Outer points of the Earthquake could not be resolved. Intensities[n]['hull'] will be None.")
                intensities.append({
                    "intensity": gprops["intensity"],
                    "width":  (e - w) * 111 * math.cos(mid_lat),
                    "height": (n - s) * 111,
                    "bbox": [w, s, e, n],
                    "hull": hull,
                })

            if not intensities:
                continue

            event = {
                "eventid":      props["eventid"],
                "description":  props["htmldescription"],
                "severity":     props["severitydata"]["severity"],
                "severitytext": props["severitydata"]["severitytext"],
                "alertlevel":   props["alertlevel"],
                "initialdate":  props["fromdate"],
                "enddate":      props["todate"],
                "intensities":  intensities,
            }

            events.append(event)

            cursor.execute("""
            INSERT OR REPLACE INTO Earthquake
                (eventid, description, severity, severitytext,
                 alertlevel, initialdate, enddate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event["eventid"], event["description"],
                event["severity"], event["severitytext"],
                event["alertlevel"], event["initialdate"], event["enddate"],
            ))

            cursor.execute("DELETE FROM Intensity WHERE eventid = ?", (event["eventid"],))

            for i in intensities:
                w, s, e, n = i["bbox"]
                hull = i.get("hull")
                cursor.execute("""
                    INSERT INTO Intensity
                        (eventid, intensity, width, height,
                        west, south, east, north, hull)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event["eventid"], i["intensity"], i["width"], i["height"],
                    w, s, e, n,
                    json.dumps(hull, separators=(",", ":")) if hull is not None else None,
                ))

            log.info(
                "[Earthquake Backend] Normalized %s (%s -- %s)",
                props["eventid"], events[-1]["initialdate"], events[-1]["enddate"],
            )

        return events

    cached = check_earthquake_db(database)
    if cached:
        return cached

    search = _gdacs_search_params("EQ", INITIAL_DATE.strftime("%Y-%m-%d"), CURRENT_DATE.strftime("%Y-%m-%d"), "red;orange")
    gdacs_info = httpx.get(_build_gdacs_url(search), timeout=250.00).json()
    result = gdacs_extract(gdacs_info=gdacs_info)
    database.connection.commit()
    return result
