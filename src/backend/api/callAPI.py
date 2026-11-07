import logging
import httpx
from backend.api import utilAPI, stream_message
from backend.request_models import getMessage
from backend.geography import locations
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from backend import errors
import datetime
import time
import sqlite3
import backend.openai_api as api

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
        
def SaveApi(app : FastAPI, database):
    @app.post("/save-api")
    def save_api(message: getMessage.API):
        pass
    
def Get_Model(app : FastAPI):
    @app.post("/get-models")
    def get_model(message: getMessage.API):
        clean_api = message.api.rstrip('/')
        query = clean_api + "/v1/models"
        response = None
        try:
            response = httpx.get(query)
            if not response.is_success:
                log.error("[Backend Model Fetch] Failed. Status: %s", response.status_code)
                return
            if "nano" in query or "nano-gpt" in query:
                log.info("[Backend Fetching Model] NanoGPT found in string, normalizing data...")
                data = response.json().get('data', [])
                if len(data) > 10:
                    shortened_data = utilAPI.shorten_data_structure(data)
                    log.info("[Backend Fetching Model] Normalized data, sending: %s", shortened_data)
                else:
                    log.info("[Backend Fetching Model] Normalized data, sending: %s", data)
                return data
            # POLYSTRATA
            elif "8080" in query:
                log.info("[Backend Fetching Model] NanoGPT found in string, normalizing data...")
                data = response.json().get('data', [])
                log.info("[Backend Fetching Model] Found model for Polystrata: %s", data[0]['id'])
                return data
            return response.json()
                
        except httpx.HTTPError as e:
            msg = f"{message.api}, Error: {e}"
            log.error("[Backend Model Fetch] Failed to fetch models from %s", msg, exc_info=True)
        
def ChatCompletions(app : FastAPI):
    @app.post("/chat/completions")
    async def chat_completions(message : getMessage.ChatCompletions, request: Request):
        url = f"{message.api.rstrip("/")}" + "/v1/chat/completions"
        log.info("[Backend Chat Completions] Received: %s. Modified to: %r", message.api, url)
        openai_tools = request.app.state.openai_tools
        mcp_client = request.app.state.mcp_client
        payload = {
            "model": message.selectedModel,
            "messages": message.history,
            "tools": openai_tools,
            "stream": True,
        }
        if not message.key:
            headers = {
                    "Content-Type": "application/json",
                    }
        else:
            headers = {
                "Authorization": f"Bearer {message.key}",
                "Content-Type": "application/json",
            }
        event_generator = stream_message.event_generator
        return StreamingResponse(event_generator(message, url, payload, headers, mcp_client), media_type="text/event-stream")
        
        
if "__main__" == __name__:
    from fastapi import FastAPI
    import httpx
    import asyncio
    import pprint
    import json
    app = FastAPI()
    Get_Model(app)
    request = httpx.request("POST", "http://localhost:9999/get-models", json={"api": "https://nano-gpt.com/api", "key": "sk-nano-aa55d085-3c2e-448a-be65-a6b104209770"})
    request.json()
    print(request.json())