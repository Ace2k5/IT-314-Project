import datetime
from typing import Any
import httpx
import math
from pprint import pprint
import logging
import json
import calendar
from shapely.geometry import MultiPoint
import time

log = logging.getLogger(__name__)
_time_lookup: dict[str, float] = dict()



def call_openmateo(position: dict[str, float]):
    log.info(f"[Backend OpenMateo] Fetching OpenMateo with Latitude: {position['latitude']}, Longitude: {position['longitude']}")
    return f"https://api.open-meteo.com/v1/forecast?latitude={position['latitude']}&longitude={position['longitude']}&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"





def check_earthquake_db(database, date: datetime.datetime | None = None):
    log.info("[Earthquake Backend] Checking SQL Database before calling GDACS...")
    if date is None:
        sql, params = "SELECT 1 FROM Earthquake LIMIT 1", ()
        log_msg = "all pre-existing records"
    else:
        date_init = datetime.datetime(date.year, date.month, 1, 0, 0, 0)
        now  = datetime.datetime.now()
        sql = "SELECT * FROM Earthquake WHERE initialdate <= ? AND enddate >= ?"
        params = (now.isoformat(), date_init.isoformat())
        log_msg = f"{date_init} -- {now}"

    database.cursor.execute(sql, params)
    found = database.cursor.fetchall()
    if found:
        log.info("[Earthquake Backend] Found an event for %s, returning...", log_msg)
        return found
    log.info("[Earthquake Backend] No event found for %s, returning None, ensure Frontend handles None.", log_msg)
    return None


def call_gdacs_earthquake(year: int, month: int, day: int, database):
        
    def simplify_coordinate(polygon: list[list[float]]) -> list[list[float]]:
        """Returns a convex hull of 'polygon', or None for a degenerate input."""
        hull = MultiPoint([tuple(p) for p in polygon]).convex_hull
        return [list(coord) for coord in hull.exterior.coords] # type: ignore[attr-defined]
        
        
    def call_gdacs(search_params: dict[str, str]):
        url_search = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?"
        query = ""
        list_query: list[str] = list()
        for key, value in search_params.items():
            pairs = f"{key}={value}"
            list_query.append(pairs)
        query += "&".join(list_query)
        log.info(f"[Backend Earthquake] Search completed as the URL Link: {url_search}{query}")
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
                polygon = i.get("polygon")
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
            
            # DB
            

        return events
    
    now = datetime.datetime.now()
    start_of_day = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
    
    cached = check_earthquake_db(database, datetime.datetime(year, month, day, 0, 0, 1))
    if cached:
        return cached
        
    search = search_params("EQ", start_of_day.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"), "red;orange")
    gdacs_info = httpx.get(call_gdacs(search_params=search), timeout=10).json()
    result = gdacs_extract(gdacs_info=gdacs_info, database=database)
    database.connection.commit()
    return result
        
                
                
# time

def check_threshold(type_of_event: str, threshold: float) -> bool:
    """
    Args:
        type_of_event (str): Type of event (e.g Earthquake, Weather...)
        threshold (int): (The threshold of time in seconds)

    Returns:
        bool: If True, will send to frontend, else, old cache still valid.
    """
    now = time.monotonic()
    last = _time_lookup.get(type_of_event)
    if last is None or now - last > threshold:
        log.info("[Backend Time Lookup] Updating cache for %s...", type_of_event)
        _time_lookup[type_of_event] = now
        return True
    log.info("[Backend Time Lookup] %s cache is still valid.", type_of_event)
    return False
        
        
        

if __name__ == "__main__":
    from backend.sql.db import Database
    database = Database()
    call_gdacs_earthquake(2018, 1, 1, database)
    database.test_db()
    