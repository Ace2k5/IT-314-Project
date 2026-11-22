"""Normalize GDACS tropical-cyclone geometry into one dict per event.

The event-level keys match ``earthquake.py``. The circle fields are:

- ``center``: ``[lon, lat]`` midpoint of the wind field the radius came from
  (this is the circle center, paired with its advisory);
- ``radius_km``: half of the longest bbox side of that green (60 km/h) field;
- ``bbox``: that field's ``[west, south, east, north]``;
- ``hull``: that field's convex hull as ``[[lon, lat], ...]``;
- ``timestamp``: the advisory label (``DD/MM HH:MM``) the field came from;
- ``position``: ``[lon, lat]`` of the storm's latest track point;
- ``wind_fields``: one entry per available wind threshold at that advisory,
  shaped like ``earthquake.py``'s ``intensities`` plus ``radius_km``;
- ``track``: every track point as ``[lon, lat]``, oldest first;
- ``track_times``: parallel advisory labels for ``track`` (same length);
- ``heading_deg``: compass bearing of the final track segment, 0 = north,
  clockwise (it describes the last, possibly forecast, movement).

GDACS only publishes per-advisory wind fields for the last three advisories,
and for older storms all of those may be zero-area points. Such an event still
carries its track, but ``center``/``radius_km``/``bbox``/``hull``/``timestamp``
are None and ``wind_fields`` is empty, so no fake circle is drawn.
"""

import datetime
import json
import logging
import math
import re
from typing import Any

import httpx

from backend.api.earthquake import simplify_coordinate
from backend.sql.db import Database

log = logging.getLogger(__name__)

PHILIPPINES = "Philippines"

# GDACS wind-field classes and the wind threshold (km/h) each one describes.
WIND_FIELD_CLASSES: dict[str, int] = {
    "Poly_Green": 60,
    "Poly_Orange": 90,
    "Poly_Red": 120,
}

# Track positions arrive as ``Point_Polygon_Point_<n>``, ordered along the path.
TRACK_POINT_PATTERN = re.compile(r"^Point_Polygon_Point_(\d+)$")

# Wind fields for one advisory carry a ``DD/MM HH:MM`` label. The same classes
# without that label are the union over the whole track and must not be used
# for a circle: their bounding box spans the storm's entire path.
WIND_TIMESTAMP_PATTERN = re.compile(r"^(\d{2})/(\d{2}) (\d{2}):(\d{2})$")


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


def _bbox_center(bbox: list[float]) -> list[float]:
    """Midpoint of ``[west, south, east, north]`` as ``[lon, lat]``."""
    west, south, east, north = bbox
    return [(west + east) / 2, (south + north) / 2]


def _bbox_from_ring(ring: list[list[float]]) -> list[float]:
    longitudes = [point[0] for point in ring]
    latitudes = [point[1] for point in ring]
    return [min(longitudes), min(latitudes), max(longitudes), max(latitudes)]


def _ring_from_geometry(geom: dict[str, Any]) -> list[list[float]]:
    """Return the outer ring(s) of a GeoJSON geometry as a flat coordinate list."""
    geom_type = geom["type"]
    coordinates = geom["coordinates"]

    if geom_type == "Point":
        return [coordinates]

    if geom_type == "Polygon":
        return [list(point) for point in coordinates[0]]

    if geom_type == "MultiPolygon":
        return [list(point) for polygon in coordinates for point in polygon[0]]

    raise ValueError(f"Unhandled geometry type: {geom_type}")


def _dimensions_km(bbox: list[float]) -> tuple[float, float]:
    """Approximate width/height of a bbox in km, as earthquake.py does."""
    west, south, east, north = bbox
    mid_lat = math.radians((south + north) / 2)
    return (east - west) * 111 * math.cos(mid_lat), (north - south) * 111


def _wind_field_entry(feature: dict[str, Any]) -> dict[str, Any]:
    """Normalize one wind polygon to a circle approximation (radius in km)."""
    ring = _ring_from_geometry(feature["geometry"])
    bbox = feature.get("bbox") or _bbox_from_ring(ring)
    width, height = _dimensions_km(bbox)
    return {
        "intensity": WIND_FIELD_CLASSES[feature["properties"]["Class"]],
        "radius_km": max(width, height) / 2,
        "width": width,
        "height": height,
        "bbox": bbox,
        "hull": simplify_coordinate(polygon=ring),
    }


def _timestamp_key(label: str, event_start: datetime.datetime) -> tuple[int, ...] | None:
    """Turn a ``DD/MM HH:MM`` wind-field label into a sortable timestamp.

    GDACS omits the year, so it is taken from the event's start date. Labels
    that fall before that date but after it in the same episode belong to the
    following year (a storm crossing New Year).
    """
    match = WIND_TIMESTAMP_PATTERN.match(label.strip())
    if match is None:
        return None

    day, month, hour, minute = (int(part) for part in match.groups())
    year = event_start.year
    if (month, day) < (event_start.month, event_start.day):
        year += 1
    return (year, month, day, hour, minute)


def _event_start(props: dict[str, Any]) -> datetime.datetime:
    try:
        return datetime.datetime.fromisoformat(props["fromdate"])
    except (KeyError, TypeError, ValueError):
        return datetime.datetime.now().replace(month=1, day=1, hour=0, minute=0, second=0)


def _bearing_deg(track: list[list[float]]) -> float | None:
    """Compass bearing of the final segment, 0 = north and clockwise."""
    if len(track) < 2:
        return None

    (lon1, lat1), (lon2, lat2) = track[-2], track[-1]
    if (lon1, lat1) == (lon2, lat2):
        return None

    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta = math.radians(lon2 - lon1)
    y = math.sin(delta) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(delta)
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def _extract_core(geometry_info: dict[str, Any], event_start: datetime.datetime) -> dict[str, Any]:
    """Pick the latest advisory with a real green wind field and normalize it.

    The circle is paired with the advisory it came from: the center is the
    green field's bbox midpoint, not the storm's final track point. Those
    diverge for decaying storms, whose final wind polygons collapse to points.

    GDACS only publishes per-advisory wind fields for the last three advisories,
    and for older storms those may all be points. Such an event still gets its
    track, but ``radius_km``/``bbox``/``hull`` stay None so no fake circle is
    drawn.
    """
    track_points: list[tuple[int, list[float], str]] = []
    centroid: list[float] | None = None
    wind_fields: dict[tuple[int, ...], dict[int, dict[str, Any]]] = {}
    labels: dict[tuple[int, ...], str] = {}

    for feature in geometry_info["features"]:
        gprops = feature["properties"]
        geom_class = gprops.get("Class") or ""

        track_match = TRACK_POINT_PATTERN.match(geom_class)
        if track_match:
            track_points.append((
                int(track_match.group(1)),
                _bbox_center(feature["bbox"]),
                (gprops.get("polygonlabel") or "").strip(),
            ))
            continue

        if geom_class == "Point_Centroid":
            centroid = _bbox_center(feature["bbox"])
            continue

        if geom_class not in WIND_FIELD_CLASSES:
            continue

        timestamp = _timestamp_key(gprops.get("polygonlabel") or "", event_start)
        if timestamp is None:
            # Track-wide union polygon: spans the whole path, not a circle.
            continue

        labels.setdefault(timestamp, (gprops.get("polygonlabel") or "").strip())
        wind_fields.setdefault(timestamp, {})[WIND_FIELD_CLASSES[geom_class]] = _wind_field_entry(feature)

    track_points.sort(key=lambda point: point[0])
    track = [point[1] for point in track_points]
    track_times = [point[2] for point in track_points] or None
    position = track[-1] if track else None

    def has_area(entry: dict[str, Any]) -> bool:
        west, south, east, north = entry["bbox"]
        return east > west and north > south

    valid = [timestamp for timestamp, fields in wind_fields.items() if 60 in fields and has_area(fields[60])]
    if not valid:
        return {
            "center": None,
            "position": position or centroid,
            "radius_km": None,
            "bbox": None,
            "hull": None,
            "timestamp": None,
            "wind_fields": [],
            "track": track,
            "track_times": track_times,
            "heading_deg": _bearing_deg(track),
        }

    selected = max(valid)
    fields = wind_fields[selected]
    green = fields[60]
    center = _bbox_center(green["bbox"])

    return {
        "center": center,
        "position": position or centroid or center,
        "radius_km": green["radius_km"],
        "bbox": green["bbox"],
        "hull": green["hull"],
        "timestamp": labels[selected],
        "wind_fields": [
            entry for _, entry in sorted(fields.items()) if has_area(entry)
        ],
        "track": track,
        "track_times": track_times,
        "heading_deg": _bearing_deg(track),
    }


def _normalize_event(props: dict[str, Any], geometry_info: dict[str, Any]) -> dict[str, Any]:
    """Build one event with the same keys as earthquake.py, plus the circle."""
    core = _extract_core(geometry_info, _event_start(props))
    if core["radius_km"] is None:
        log.warning(
            "[Backend Typhoon] %s has no observable wind field; returning a track-only event.",
            props.get("eventid"),
        )

    severity = props.get("severitydata") or {}
    return {
        "eventid": int(props["eventid"]),
        "description": props.get("htmldescription"),
        "severity": severity.get("severity"),
        "severitytext": severity.get("severitytext"),
        "alertlevel": props.get("alertlevel"),
        "initialdate": props.get("fromdate"),
        "enddate": props.get("todate"),
        **core,
    }


def check_typhoon_db(database: Database) -> list[dict[str, Any]] | None:
    log.info("[Backend Typhoon] Checking SQL Database before calling GDACS...")
    cursor = database.connection.cursor()

    cursor.execute("SELECT * FROM Typhoon")
    events = cursor.fetchall()
    if not events:
        log.info("[Backend Typhoon] Typhoon table is empty.")
        return None

    log.info("[Backend Typhoon] Fetched all Typhoon information.")
    result = []
    for event in events:
        cursor.execute(
            "SELECT intensity, radius_km, width, height, west, south, east, north, hull "
            "FROM WindField WHERE eventid = ?",
            (event["eventid"],),
        )
        wind_fields = [
            {
                "intensity": row["intensity"],
                "radius_km": row["radius_km"],
                "width":     row["width"],
                "height":    row["height"],
                "bbox":      [row["west"], row["south"], row["east"], row["north"]],
                "hull":      json.loads(row["hull"]) if row["hull"] else None,
            }
            for row in cursor.fetchall()
        ]
        has_center = event["center_lon"] is not None and event["center_lat"] is not None
        has_position = event["position_lon"] is not None and event["position_lat"] is not None
        has_bbox = event["west"] is not None and event["south"] is not None

        cursor.execute(
            "SELECT longitude, latitude, timestamp FROM TrackPoint WHERE eventid = ? ORDER BY ordinal",
            (event["eventid"],),
        )
        track_rows = cursor.fetchall()
        track = [[row["longitude"], row["latitude"]] for row in track_rows]
        track_times = [row["timestamp"] for row in track_rows] or None

        result.append({
            "eventid":     int(event["eventid"]),
            "description": event["description"],
            "severity":    event["severity"],
            "severitytext": event["severitytext"],
            "alertlevel":  event["alertlevel"],
            "initialdate": event["initialdate"],
            "enddate":     event["enddate"],
            "center":      [event["center_lon"], event["center_lat"]] if has_center else None,
            "position":    [event["position_lon"], event["position_lat"]] if has_position else None,
            "radius_km":   event["radius_km"],
            "bbox":        [event["west"], event["south"], event["east"], event["north"]] if has_bbox else None,
            "hull":        json.loads(event["hull"]) if event["hull"] else None,
            "timestamp":   event["wind_timestamp"],
            "wind_fields": wind_fields,
            "track":       track,
            "track_times": track_times,
            "heading_deg": _bearing_deg(track),
        })
    return result


def call_gdacs_typhoon(database: Database) -> list[dict[str, Any]]:
    CURRENT_DATE = datetime.datetime.now()
    INITIAL_DATE = CURRENT_DATE.replace(year=1980, month=1, day=1, hour=0, minute=0, second=0)

    cached = check_typhoon_db(database)
    if cached:
        return cached

    search_params = _gdacs_search_params(
        eventlist="TC",
        fromdate=INITIAL_DATE.strftime("%Y-%m-%d"),
        todate=CURRENT_DATE.strftime("%Y-%m-%d"),
        alertlevel="red;orange",
    )
    gdacs_info = httpx.get(url=_build_gdacs_url(search_params=search_params), timeout=250.00).json()

    log.info("[Backend Typhoon] Fetching Typhoon information from GDACS.")
    events: list[dict[str, Any]] = []
    cursor = database.connection.cursor()

    for feature in gdacs_info["features"]:
        props = feature["properties"]

        # GDACS lists several countries per storm ("China, Philippines"), so an
        # exact comparison would drop most storms that affect the Philippines.
        countries = [country.strip() for country in (props.get("country") or "").split(",")]
        if PHILIPPINES not in countries:
            continue

        log.info("[Backend Typhoon] Philippines found: %s", props["eventid"])

        geometry_info = httpx.get(url=props["url"]["geometry"], timeout=60).json()
        event = _normalize_event(props, geometry_info)

        events.append(event)

        center_lon, center_lat = event["center"] or (None, None)
        position_lon, position_lat = event["position"] or (None, None)
        west, south, east, north = event["bbox"] or (None, None, None, None)
        cursor.execute("""
        INSERT OR REPLACE INTO Typhoon
            (eventid, description, severity, severitytext,
             alertlevel, initialdate, enddate,
             center_lon, center_lat, position_lon, position_lat,
             radius_km, west, south, east, north, hull, wind_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            event["eventid"], event["description"], event["severity"],
            event["severitytext"], event["alertlevel"], event["initialdate"],
            event["enddate"], center_lon, center_lat, position_lon, position_lat,
            event["radius_km"], west, south, east, north,
            json.dumps(event["hull"], separators=(",", ":")) if event["hull"] is not None else None,
            event["timestamp"],
        ))

        cursor.execute("DELETE FROM WindField WHERE eventid = ?", (event["eventid"],))

        for wind_field in event["wind_fields"]:
            w, s, e, n = wind_field["bbox"]
            hull = wind_field["hull"]
            cursor.execute("""
                INSERT INTO WindField
                    (eventid, intensity, radius_km, width, height,
                     west, south, east, north, hull)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event["eventid"], wind_field["intensity"], wind_field["radius_km"],
                wind_field["width"], wind_field["height"], w, s, e, n,
                json.dumps(hull, separators=(",", ":")) if hull is not None else None,
            ))

        cursor.execute("DELETE FROM TrackPoint WHERE eventid = ?", (event["eventid"],))
        times = event["track_times"] or []
        for ordinal, point in enumerate(event["track"]):
            cursor.execute("""
                INSERT INTO TrackPoint
                    (eventid, ordinal, longitude, latitude, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (
                event["eventid"], ordinal, point[0], point[1],
                times[ordinal] if ordinal < len(times) else None,
            ))

        log.info(
            "[Backend Typhoon] Normalized %s (%s -- %s)",
            event["eventid"], event["initialdate"], event["enddate"],
        )

    database.connection.commit()
    return events


if __name__ == "__main__":
    from backend import logger
    from io import StringIO

    logger.setup_log(StringIO(), logger.INFO_LOG_PATH)
    call_gdacs_typhoon(Database())
