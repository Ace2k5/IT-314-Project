from pydantic import BaseModel
from typing import Optional

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
    searchKey: str
    session_id: str
    history: list[dict[str, str]]
    
class Shelter(BaseModel):
    id: int
    name: str
    lat: float
    lon: float
    type: str                 # e.g., "school", "covered_court", "exclusive_shelter"
    address: Optional[str] = None