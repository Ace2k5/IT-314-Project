import logging
import httpx
from backend.api import utilAPI
from backend.request_models import getMessage
from backend.geography import locations
from fastapi import FastAPI
from backend import errors
import time
import sqlite3

log = logging.getLogger(__name__)
last_datetime = 0
weather_location_cache = dict()
weather_region_cache = dict()

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
    threshold = 180 * 1000
    
    def helper_func(loc: dict[str, dict[str, float]], fetched_at: float):
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
                "fetched_at": fetched_at
            }
        return dictionary_of_location
    
    @app.post("/weather")
    def get_weather(WeatherInfo : getMessage.WeatherInfo):
        global weather_location_cache, weather_region_cache, last_datetime  
        log.info("[Backend Info] Grabbing weather information...")
        log.info("[Backend Info] Initializing both caches.")
        
        current_datetime = time.time() * 1000
        if (current_datetime - last_datetime) > threshold:
            log.info("[Cache] Conditional met for time, cache now updating...")
            dictionary_of_locations = helper_func(locations.LOCATIONS, current_datetime)
            weather_location_cache = dictionary_of_locations
            log.info("[Cache] Location cache updated.")
            dictionary_of_locations = helper_func(locations.REGIONS, current_datetime)
            weather_region_cache = dictionary_of_locations
            log.info("[Cache] Region cache updated.")
            
            last_datetime = current_datetime
        else:
            log.info("[Cache] Threshold not met, returning existing cache.")
        if WeatherInfo.is_detailed == True:
            log.info("[Cache] Returning location saved cache.")
            return weather_location_cache
        else:
            log.info("[Cache] Returning region saved cache.")
            return weather_region_cache
        
def gdacs(app: FastAPI, database):
    @app.post("/earthquake")
    def earthquake(EarthquakeDate : getMessage.EarthquakeDate):
        log.info("[Earthquake Backend Information] Grabbing Earthquake information...")
        year = EarthquakeDate.year
        month = EarthquakeDate.month
        day = EarthquakeDate.day
        log.info("[Earthquake Backend Information] Looking for")
        result = utilAPI.call_gdacs_earthquake(year, month, day, database)
        if not result:
            log.info("[Earthquake Information]: Could not grab anything.")
        else:
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
    def helper_func(loc: dict[str, dict[str, float]]):
        dictionary_of_location = dict()
        for location, position in loc.items():
            weather = ""
            url = f"https://api.open-meteo.com/v1/forecast?latitude={position['latitude']}&longitude={position['longitude']}&current=temperature_2m,weather_code&timezone=Asia%2FSingapore" # type: ignore
            response = httpx.get(url)
            data = response.json()
            dictionary_of_location[location] = {
                "latitude": position['latitude'],
                "longitude": position['longitude'],
                "temperature": data["current"]["temperature_2m"],
                "temperature_unit": data["current_units"]["temperature_2m"],
                "weather": data["current"]["weather_code"],
            }
        return dictionary_of_location