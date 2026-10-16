import logging
import httpx
from backend.api import utilAPI
from backend.request_models import getMessage
from backend.geography import locations
from fastapi import FastAPI
from backend import errors
import datetime
import time
import sqlite3

log = logging.getLogger(__name__)
last_datetime: float = 0.0
weather_location_cache: dict[str, dict[str, str | int]] = dict()
weather_region_cache: dict[str, dict[str, str | int]] = dict()

def weather_coroutes(app : FastAPI):
    weather_icons = {
        0: "sunny",
        1: "sunny",
        2: "cloudy",
        3: "cloudy",

        45: "cloudy",
        48: "cloudy",

        51: "rainy",
        53: "rainy",
        55: "rainy",
        56: "rainy",
        57: "rainy",

        61: "rainy",
        63: "rainy",
        65: "rainy",
        66: "rainy",
        67: "rainy",

        71: "snowy",
        73: "snowy",
        75: "snowy",
        77: "snowy",

        80: "rainy",
        81: "rainy",
        82: "rainy",

        85: "snowy",
        86: "snowy",

        95: "stormy",
        96: "stormy",
        97: "stormy",
        99: "stormy",
    }
    threshold = 180
    
    def fetch_weather_for_all(loc: dict[str, dict[str, float]]):
        log.info("[Weather] Getting weather...")
        dictionary_of_location = dict()
        for location, position in loc.items():
            url = utilAPI.call_openmateo(position)
            response = httpx.get(url, timeout=10)
            data = response.json()
            log.info(f"[Weather] Received as {data}")
            dictionary_of_location[location] = {
                "latitude": position['latitude'],
                "longitude": position['longitude'],
                "temperature": data["current"]["temperature_2m"],
                "temperature_unit": data["current_units"]["temperature_2m"],
                "weather": data["current"]["weather_code"],
                "weather_icon": weather_icons[data["current"]["weather_code"]],
            }
        return dictionary_of_location
    
    @app.get("/weather/high")
    def get_weather_high():
        global weather_location_cache
        if utilAPI.is_stale("weather_high", threshold):
            log.info("[Cache] Refreshing high-res weather...")
            weather_location_cache = fetch_weather_for_all(locations.LOCATIONS)
            utilAPI.mark_refreshed("weather_high")
        else:
            log.info("[Cache] high-res still fresh.")
        return weather_location_cache


    @app.get("/weather/low")
    def get_weather_low():
        global weather_region_cache
        if utilAPI.is_stale("weather_low", threshold):
            log.info("[Cache] Refreshing low-res weather...")
            weather_region_cache = fetch_weather_for_all(locations.REGIONS)
            utilAPI.mark_refreshed("weather_low")
        else:
            log.info("[Cache] low-res still fresh.")
        return weather_region_cache
    
def gdacs(app: FastAPI, database):
    @app.post("/earthquake")
    def earthquake(EarthquakeDate : getMessage.EarthquakeDate):
        log.info("[Earthquake Backend Information] Grabbing Earthquake information...")
        year = EarthquakeDate.year
        month = EarthquakeDate.month
        day = EarthquakeDate.day
        log.info("[Earthquake Backend Information] Looking for %s", f"{year}-{month}-{day}")
        result: list[dict] | None = utilAPI.call_gdacs_earthquake(year, month, day, database)
        if not result:
            log.info("[Earthquake Information]: Could not grab anything.")
            return {"events": []}
        log.info(f"[Earthquake Information]: {result}")
        return result
        
        
def check_status(app : FastAPI):
    @app.get("/status")
    def status():
        response = {
            "text": "Connection Successful"
        }
        return response
    
    
def process_log(app : FastAPI, stringIO):
    @app.post("/log")
    def log_message(message : getMessage.LogMessage):
        try:
            if message:
                log.info(message.key)
                temp = stringIO.getvalue()
                log_message = {
                    "log_message": temp
                }
                return log_message
        except Exception as e:
            log.info(e)
            raise errors.ProcessingError("Something went wrong with processing the message to log, please check info.log")
        
        
        
if "__main__" == __name__:
    from backend.sql import db
    from pprint import pprint
    import asyncio
    import logging
    from backend import logger
    from io import StringIO
    
    log = logging.getLogger(__name__)
    logger.setup_log(StringIO())
    app = FastAPI()
    database = db.Database()
    async def test():
        log.info("[Earthquake Backend Information] Grabbing Earthquake information...")
        year = 2026
        month = 6
        day = 7
        log.info("[Earthquake Backend Information] Looking for")
        result = utilAPI.call_gdacs_earthquake(year=year, month=month, day=day, database=database)
        if not result:
            log.info("[Earthquake Information]: Could not grab anything.")
        else:
            log.info(f"[Earthquake Information]: {result}")
        log.info(result)
        return result
    result = asyncio.run(test())
    pprint(result)