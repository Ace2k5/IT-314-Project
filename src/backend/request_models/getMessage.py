from pydantic import BaseModel

class LogMessage(BaseModel):
    key: str

class WeatherInfo(BaseModel):
    is_detailed: bool
    
class EarthquakeDate(BaseModel):
    year: int
    month: int
    day: int
    
class API(BaseModel):
    api: str
    key: str
    
class ChatCompletions(BaseModel):
    api: str
    key: str
    selectedModel: str
    history: list[dict[str, str]]