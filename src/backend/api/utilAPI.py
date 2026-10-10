import datetime
from typing import Any
import httpx
import math
from pprint import pprint
import logging
import sqlite3
import json

log = logging.getLogger("__name__")


def call_openmateo(position: dict[str, float]):
    log.info(f"[Backend OpenMateo] Fetching OpenMateo with Latitude: {position['latitude']}, Longitude: {position['longitude']}")
    return f"https://api.open-meteo.com/v1/forecast?latitude={position['latitude']}&longitude={position['longitude']}&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"


def call_gdacs_earthquake(year: int, month: int, day: int, database):
    log.info(f"[Backend Earthquake] Fetching Earthquake information from GDACS.")
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
    
    def flatten_to_ring(geom: dict) -> list[list[float]]:
        t = geom["type"]
        c = geom["coordinates"]

        if t == "Point":
            return [c]

        if t == "Polygon":
            return [pt for ring in c for pt in ring]

        if t == "MultiPolygon":
            return [pt for poly in c for ring in poly for pt in ring]

        raise ValueError(f"Unhandled geometry type: {t}")

    async def gdacs_extract(gdacs_info: dict[str, Any], database) -> list[dict[str, Any]]:
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
                intensities.append({
                    "intensity": gprops["intensity"],
                    "geom_type": geometry["geometry"]["type"],
                    "width":  (e - w) * 111 * math.cos(mid_lat),
                    "height": (n - s) * 111,
                    "bbox": [w, s, e, n],
                    "polygon":  flatten_to_ring(geometry["geometry"])
                })

            if not intensities:
                continue

            from_date = props["fromdate"]
            to_date = props["todate"]

            event = {
                "eventid":      props["eventid"],
                "description":  props["htmldescription"],
                "severity":     props["severitydata"]["severity"],
                "severitytext": props["severitydata"]["severitytext"],
                "alertlevel":   props["alertlevel"],
                "initialdate":  from_date,
                "enddate":      to_date,
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
                database.cursor.execute("""
                    INSERT INTO Intensity
                        (eventid, intensity, width, height,
                        west, south, east, north, polygon)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    event["eventid"], i["intensity"], i["width"], i["height"],
                    w, s, e, n,
                    json.dumps(i["polygon"], separators=(",", ":")),
                ))


            log.info(
                "[Earthquake Backend] Normalized %s (%s -- %s)",
                props["eventid"], events[-1]["initialdate"], events[-1]["enddate"],
            )
            
            # DB
            

        return events
    
    now = datetime.datetime.now()
    start_of_day = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
    search = search_params("EQ", start_of_day.strftime("%Y-%m-%d"), now.strftime("%Y-%m-%d"), "red;orange")
    gdacs_info = httpx.get(call_gdacs(search_params=search), timeout=10).json()
    result = gdacs_extract(gdacs_info=gdacs_info, database=database)
    database.connection.commit()
    return result
        
                
            
        
        

if __name__ == "__main__":
    TEMP_URL = "https://api.open-meteo.com/v1/forecast?latitude=10.3333&longitude=123.75&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"
    now = datetime.datetime.now()
    start_of_day = now.replace(month=1,day=1,hour=0, minute=0, second=0, microsecond=0)
    result = call_gdacs_earthquake(year=2026, month=1, day=1)
    pprint(result)