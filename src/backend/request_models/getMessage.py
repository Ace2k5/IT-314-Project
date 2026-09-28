from pydantic import BaseModel

class LogMessage(BaseModel):
    key: str

class WeatherInfo(BaseModel):
    is_detailed: bool