import logging
import httpx
from backend.api import configAPI
from backend.request_models import getMessage
from fastapi import FastAPI
from backend import errors

log = logging.getLogger(__name__)

def weather_coroutes(app : FastAPI):
    @app.get("/weather")
    def get_weather():
        url = configAPI.TEMP_URL
        response = httpx.get(url)
        
        return response.json()
    
def check_status(app : FastAPI):
    @app.get("/status")
    def status():
        response = {
            "text": "Hello World"
        }
        
        return response
    
def process_log(app : FastAPI, stringIO):
    @app.post("/log")
    def log_message(message : getMessage.LogMessage):
        try:
            if message:
                log.info(message)
                temp = stringIO.getvalue()
                log_message = {
                    "log_message": temp
                }
                return log_message
        except Exception as e:
            log.info(e)
            raise errors.ProcessingError("Something went wrong with processing the message to log, please check info.log")
        