import datetime
from typing import Any
import httpx
import math
from pprint import pprint

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
    outer_list = list()
    for feature in gdacs_info["features"]:
        if feature["properties"]["country"]== "Philippines":
            outer_prop = feature["properties"]
            print(outer_prop["htmldescription"])
            geometry_info = httpx.get(url=feature["properties"]["url"]["geometry"], timeout=10).json()
            for geometry in geometry_info["features"]:
                if "intensity" in geometry["properties"]:
                    inner_prop = geometry["properties"]
                    if inner_prop["intensity"] in (4, 6, 8):
                        intensity = inner_prop["intensity"]
                        
                        w, s, e, n = geometry["bbox"]
                        width_km  = (e - w) * 111 * math.cos(math.radians((s + n) / 2))   # longitude shrinks with latitude
                        height_km = (n - s) * 111
                        temp, temp2 = outer_prop["fromdate"].split("T"), outer_prop["fromdate"].split("T")
                        initialdate = " | ".join(temp)
                        enddate = " | ".join(temp2)
                        inner_dict = {
                            "description": outer_prop["htmldescription"],
                            "severity": outer_prop["severitydata"]["severity"],
                            "severitytext": outer_prop["severitydata"]["severitytext"],
                            "alertlevel": outer_prop["alertlevel"],
                            "intensity": intensity,
                            "width": width_km,
                            "height": height_km,
                            "initialdate": initialdate,
                            "enddate": enddate
                            
                        }
                        outer_list.append(inner_dict)
    return outer_list
        
                
            
        
        

if __name__ == "__main__":
    TEMP_URL = "https://api.open-meteo.com/v1/forecast?latitude=10.3333&longitude=123.75&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"
    now = datetime.datetime.now()
    start_of_day = now.replace(month=1,day=1,hour=0, minute=0, second=0, microsecond=0)
    search = search_params("EQ", start_of_day, now, "red;orange")
    result = httpx.get(call_gdacs(search_params=search), timeout=10)
    pprint(gdacs_extract(result.json()))