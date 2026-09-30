import datetime
from typing import Any
import httpx

def call_openmateo(position: dict[str, float]):
    return f"https://api.open-meteo.com/v1/forecast?latitude={position['latitude']}&longitude={position['longitude']}&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"

def call_gdacs(search_params: dict[str, str]):
    url_search = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?"
    search = ""
    list_query = list()
    for key, value in search_params.items():
        pairs = f"{key}={value}"
        list_query.append(pairs)
    search += "&".join(list_query)
    return f"{url_search}{search}"
        

def search_params(eventlist: str, fromdate: datetime.datetime, todate: datetime.datetime, alertlevel: str):
    '''
    Expected format for search_params (GDACS):
    country: "PHL",
    eventlist: "EQ;TC;FL;VO",
    alertlevel: "orange;red",
    fromdate: toDateOnly(startDate),
    todate: toDateOnly(today)
    
    Example link: https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?country=PHL&eventlist=EQ;TC&fromdate=2026-09-01&todate=2026-09-30&alertlevel=red      
    separated by &.
    '''
    params = {
            "eventlist": eventlist,
            "fromdate": fromdate,
            "todate": todate,
            "alertlevel": alertlevel
    }
    return params

def gdacs_extract(gdacs_info: dict[str, Any]):
    ph = dict()
    gdacs_len = len(gdacs_info)
    for event in range(len(gdacs_info)):
        if gdacs_info["properties"]["country"] == "Philippines":
            print("Working")
            """
            geometry_info = httpx.get(url=event["properties"]["url"]["geometry"], timeout=10).json()
            iter_geometry = len(geometry_info)
            print(iter_geometry)
            for i in range(iter_geometry):
                for properties in geometry_info[i]["properties"]:
                    if properties["intensity"] in (4, 6, 8):
                        print("WORKING")
        
            ph = {
                "description": gdacs_info["properties"]["htmldescription"],
                "alertlevel": gdacs_info["properties"]["alertlevel"],
                "severity": gdacs_info["properties"]["severitydata"]["severity"],
                "severitytext": gdacs_info["properties"]["severitydata"]["severitytext"],
                "severityunit": gdacs_info["properties"]["severitydata"]["severityunit"]
            }"""
            
        
        

if __name__ == "__main__":
    TEMP_URL = "https://api.open-meteo.com/v1/forecast?latitude=10.3333&longitude=123.75&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"
    now = datetime.datetime.now()
    start_of_day = now.replace(month=1,day=1,hour=0, minute=0, second=0, microsecond=0)
    search = search_params("EQ", start_of_day, now, "red;orange")
    result = httpx.get(call_gdacs(search_params=search), timeout=10)
    gdacs_extract(result.json())