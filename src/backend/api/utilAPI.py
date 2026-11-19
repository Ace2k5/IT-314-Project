import datetime
from typing import Any
import httpx
import math
import logging
import json
import calendar
from shapely.geometry import MultiPoint
import time
from backend.sql.db import Database

log = logging.getLogger(__name__)
_time_lookup: dict[str, float] = dict()



def build_open_meteo_url(positions: list[dict[str, float]]) -> str:
    """One forecast request for every position.

    Open-Meteo accepts comma separated coordinate lists, so the whole city set
    costs a single round trip instead of one per location.
    """
    latitudes = ",".join(str(position["latitude"]) for position in positions)
    longitudes = ",".join(str(position["longitude"]) for position in positions)
    log.info("[Backend OpenMeteo] Requesting %s location(s) in one call.", len(positions))
    return (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitudes}&longitude={longitudes}"
        "&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"
    )





def check_earthquake_db(database, date: datetime.datetime | None = None):
    log.info("[Earthquake Backend] Checking SQL Database before calling GDACS...")
    if date is None:
        sql, params = "SELECT 1 FROM Earthquake LIMIT 1", ()
        log_msg = "all pre-existing records"
    else:
        month_start, month_end = date_range(date)
        sql = "SELECT * FROM Earthquake WHERE initialdate <= ? AND enddate >= ?"
        params = (month_end.isoformat(), month_start.isoformat())
        log_msg = f"{month_start} -- {month_end}"

    database.cursor.execute(sql, params)
    events = database.cursor.fetchall()
    result = []
    if events:
        log.info("[Earthquake Backend] Found an event for %s, intensity next.", log_msg)
        for event in events:
            database.cursor.execute(
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
                for row in database.cursor.fetchall()
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
        
    log.info("[Earthquake Backend] No event found for %s, returning None.", log_msg)
    return None

def date_range(date: datetime.datetime) -> list[datetime.datetime]:
    last_day = calendar.monthrange(date.year, date.month)[1]
    month_start = datetime.datetime(date.year, date.month, 1)
    month_end   = datetime.datetime(date.year, date.month, last_day)
    return [month_start, month_end]


def call_gdacs_earthquake(year: int, month: int, day: int, database: Database):
        
    def simplify_coordinate(polygon: list[list[float]]) -> list[list[float]] | None:
        """Return the convex hull of ``polygon``, or None for a degenerate input."""
        if not polygon:
            return None
        hull = MultiPoint([tuple(point) for point in polygon]).convex_hull
        if hull.is_empty or not hasattr(hull, "exterior"):
            return None
        return [list(coordinate) for coordinate in hull.exterior.coords]
        
        
    def call_gdacs(search_params: dict[str, str]):
        url_search = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?"
        query = ""
        list_query: list[str] = list()
        for key, value in search_params.items():
            pairs = f"{key}={value}"
            list_query.append(pairs)
        query += "&".join(list_query)
        
        log.info("[Backend Earthquake] Search completed as the URL Link: %s", (url_search + query))
        return f"{url_search}{query}"
            

    def search_params(eventlist: str, fromdate: str, todate: str, alertlevel: str):
        '''
        Expected format for search_params (GDACS):
        country: "PHL",
        eventlist: "EQ;TC;FL;VO",
        alertlevel: "orange;red",
        fromdate: toDateOnly(startDate),
        todate: toDateOnly(today)
        
        Example link: https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?country=PHL&eventlist=EQ;TC&fromdate=2026-09-01&todate=2026-09-30&alertlevel=red      
        separated by &.
        '''
        params: dict[str, str] = {
                "eventlist": eventlist,
                "fromdate": fromdate,
                "todate": todate,
                "alertlevel": alertlevel
        }
        return params
    
    def _flatten_to_ring(geom: dict) -> list[list[float]]:
        t = geom["type"]
        c = geom["coordinates"]

        if t == "Point":
            return [c]

        if t == "Polygon":
            return [pt for ring in c for pt in ring]

        if t == "MultiPolygon":
            return [pt for poly in c for ring in poly for pt in ring]

        raise ValueError(f"Unhandled geometry type: {t}")

    def gdacs_extract(gdacs_info: dict[str, Any], database) -> list[dict[str, Any]]:
        log.info(f"[Backend Earthquake] Fetching Earthquake information from GDACS.")
        events: list[dict[str, Any]] = []

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
                    log.warning("[Earthquake Backend] Outer points of the Earthquake could not be resolved, please check ./src/backend/api/utilAPI.py and debug. Intensities[n]['hull'] will be None, ensure Frontend handles None.")
                intensities.append({
                    "intensity": gprops["intensity"],
                    "width":  (e - w) * 111 * math.cos(mid_lat),
                    "height": (n - s) * 111,
                    "bbox": [w, s, e, n],
                    "hull": hull
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
            
            # DB
            
            database.cursor.execute("""
            INSERT OR REPLACE INTO Earthquake
                (eventid, description, severity, severitytext,
                 alertlevel, initialdate, enddate)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                event["eventid"], event["description"],
                event["severity"], event["severitytext"],
                event["alertlevel"], event["initialdate"], event["enddate"],
            ))

            database.cursor.execute("DELETE FROM Intensity WHERE eventid = ?", (event["eventid"],))

            for i in intensities:
                w, s, e, n = i["bbox"]
                hull = i.get("hull")
                database.cursor.execute("""
                    INSERT INTO Intensity
                        (eventid, intensity, width, height,
                        west, south, east, north, hull)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event["eventid"], i["intensity"], i["width"], i["height"],
                    w, s, e, n,
                    json.dumps(hull, separators=(",", ":")) if hull is not None else None
                ))


            log.info(
                "[Earthquake Backend] Normalized %s (%s -- %s)",
                props["eventid"], events[-1]["initialdate"], events[-1]["enddate"],
            )

        return events
    
    now = datetime.datetime.now()
    start_of_day = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
    month_start, month_end = date_range(start_of_day)
    cached = check_earthquake_db(database, datetime.datetime(year, month, day, 0, 0, 1))
    if cached:
        return cached    
    search = search_params("EQ", month_start.strftime("%Y-%m-%d"), month_end.strftime("%Y-%m-%d"), "red;orange")

    # When GDACS finds no information about any Earthquake for this specific date, immediate return, no need for the threshold function.
    gdacs_info = httpx.get(call_gdacs(search_params=search), timeout=10).json()
    # ---------------------------------------------------------------------------------------------------------------------------------
    result = gdacs_extract(gdacs_info=gdacs_info, database=database)
    database.connection.commit()
    return result


def get_shelters(database: Database) -> dict[int, dict[str, Any]] | None:
    database.cursor.execute("SELECT * FROM Shelters")
    rows = database.cursor.fetchall()
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
                
                
# time

def is_stale(type_of_event: str, threshold: float) -> bool:
    now = time.monotonic()
    last = _time_lookup.get(type_of_event)
    return last is None or now - last > threshold

def mark_refreshed(type_of_event: str) -> None:
    _time_lookup[type_of_event] = time.monotonic()
        
# shorten very large data structures

def shorten_data_structure(data_structure: list[Any] | dict[str, Any], limit: int = 10):
    """Keep only the first ``limit`` entries, so a huge payload stays readable."""
    if isinstance(data_structure, list):
        if len(data_structure) > limit:
            log.info("[Backend Shortening Data Structure] Kept %s of %s entries.", limit, len(data_structure))
            return data_structure[:limit]
    return data_structure


if __name__ == "__main__":
    database = Database()
    call_gdacs_earthquake(2018, 1, 1, database)
    database.check_db()
