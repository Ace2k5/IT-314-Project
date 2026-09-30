import logging
import httpx
from backend.api import configAPI
from backend.request_models import getMessage
from backend.geography import locations
from fastapi import FastAPI
from backend import errors
import datetime

log = logging.getLogger(__name__)

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
    
    log.info("Grabbing weather information...")
    last_datetime = datetime.datetime.now()
    threshold = datetime.timedelta(
        minutes=3
    )
    weather_location_cache = dict()
    weather_region_cache = dict()
    is_first_time = True
    
    def helper_func(loc: dict[str, dict[str, float]]):
        dictionary_of_location = dict()
        for location, position in loc.items():
            url = configAPI.call_openmateo(position)
            response = httpx.get(url, timeout=10)
            data = response.json()
            dictionary_of_location[location] = {
                "latitude": position['latitude'],
                "longitude": position['longitude'],
                "temperature": data["current"]["temperature_2m"],
                "temperature_unit": data["current_units"]["temperature_2m"],
                "weather": data["current"]["weather_code"],
                "weather_icon": weather_icons[data["current"]["weather_code"]]
            }
        return dictionary_of_location
    
    @app.post("/weather")
    def get_weather(is_detailed : getMessage.WeatherInfo):
        
        nonlocal weather_location_cache
        nonlocal weather_region_cache
        nonlocal last_datetime
        nonlocal is_first_time
        
        current_datetime = datetime.datetime.now()
        if is_first_time == True or (current_datetime - last_datetime) > threshold:
            last_datetime = current_datetime
            is_first_time = False
            if is_detailed.is_detailed == True:
                dictionary_of_locations = helper_func(locations.LOCATIONS)
                weather_location_cache = dictionary_of_locations
                return dictionary_of_locations
            else:
                dictionary_of_locations = helper_func(locations.REGIONS)
                weather_region_cache = dictionary_of_locations
                return dictionary_of_locations
        else:
            if is_detailed.is_detailed == True:
                return weather_location_cache
            else:
                return weather_region_cache
        
def gdacs(app: FastAPI):
    @app.get("/earthquake")
    def earthquake():
        log.info("[Earthquake Information]: Grabbing Earthquake information...")
        now = datetime.datetime.now()
        start_of_day = now.replace(month=1,day=1,hour=0, minute=0, second=0, microsecond=0)
        search = configAPI.search_params(None, "EQ", start_of_day, now, "red;orange")
        result = httpx.get(configAPI.call_gdacs(search_params=search), timeout=10)
        if not result:
            log.info("[Earthquake Information]: Could not grab anything.")
        else:
            log.info(f"[Earthquake Information]: {result.json()}")
        return result.json()
        
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