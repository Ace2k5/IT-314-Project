from pydantic import BaseModel

class LogMessage(BaseModel):
    key: str
    
class WeatherInfo(BaseModel):
    current_location: str