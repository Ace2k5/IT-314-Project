import datetime
from typing import Any
import httpx
import math
from pprint import pprint
import logging
import sqlite3
import json
import calendar
from shapely.geometry import MultiPoint

log = logging.getLogger("__name__")



def call_openmateo(position: dict[str, float]):
    log.info(f"[Backend OpenMateo] Fetching OpenMateo with Latitude: {position['latitude']}, Longitude: {position['longitude']}")
    return f"https://api.open-meteo.com/v1/forecast?latitude={position['latitude']}&longitude={position['longitude']}&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"





def check_earthquake_db(database, date: datetime.datetime | None = None):
    if date is None:
        sql, params = "SELECT 1 FROM Earthquake LIMIT 1", ()
        log_msg = "all pre-existing records"
    else:
        last_day = calendar.monthrange(date.year, date.month)[1]
        date_init = datetime.datetime(date.year, date.month, 1, 0, 0, 0)
        date_end  = datetime.datetime(date.year, date.month, last_day, 23, 59, 59)
        sql = "SELECT * FROM Earthquake WHERE initialdate >= ? AND enddate <= ?"
        params = (date_init.isoformat(), date_end.isoformat())
        log_msg = f"{date_init} -- {date_end}"

    database.cursor.execute(sql, params)
    found = database.cursor.fetchall()
    if found:
        log.info("[Earthquake Backend] Found an event for %s, returning...", log_msg)
        return found
    log.info("[Earthquake Backend] No event found for %s, returning None, ensure Frontend handles None.", log_msg)
    return None


def call_gdacs_earthquake(year: int, month: int, day: int, database):
    log.info(f"[Backend Earthquake] Fetching Earthquake information from GDACS.")
        
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
                    "geom_type": geometry["geometry"]["type"],
                    "width":  (e - w) * 111 * math.cos(mid_lat),
                    "height": (n - s) * 111,
                    "bbox": [w, s, e, n],
                    "polygon": raw_polygon,
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
                        west, south, east, north, polygon, hull)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event["eventid"], i["intensity"], i["width"], i["height"],
                    w, s, e, n,
                    json.dumps(polygon, separators=(",", ":")) if polygon is not None else None,
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
        
                
            
        
        

if __name__ == "__main__":
    print(datetime.datetime.now())