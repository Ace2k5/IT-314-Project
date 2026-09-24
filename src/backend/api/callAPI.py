import logging, httpx
from backend.api import configAPI

log = logging.getLogger(__name__)

def weather_coroutes(app):
    @app.get("/weather")
    def get_weather():
        url = configAPI.TEMP_URL
        response = httpx.get(url)
        
        return response.json()
    
def check_status(app):
    @app.get("/status")
    def status():
        response = {
            "text": "Hello World"
        }
        
        return response
        