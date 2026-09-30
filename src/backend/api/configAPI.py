import datetime

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
        

def search_params(country: str | None, eventlist: str, fromdate: datetime.datetime, todate: datetime.datetime, alertlevel: str):
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
    params = dict()
    if country is None:
        params = {
                "eventlist": eventlist,
                "fromdate": fromdate,
                "todate": todate,
                "alertlevel": alertlevel
            }
    else:
        params = {
            "country": country,
            "eventlist": eventlist,
            "fromdate": fromdate,
            "todate": todate,
            "alertlevel": alertlevel
        }
    return params

if __name__ == "__main__":
    def search_params(country: str | None, eventlist: str, fromdate: datetime.datetime, todate: datetime.datetime, alertlevel: str):
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
            "country": country,
            "eventlist": eventlist,
            "fromdate": fromdate,
            "todate": todate,
            "alertlevel": alertlevel
        }
        return params
    
    def test(search_params: dict[str, str]):
        
        url_search = "https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?"
        search = ""
        list_query = list()
        for key, value in search_params.items():
            pairs = f"{key}={value}"
            list_query.append(pairs)
        search += "&".join(list_query)
        return f"{url_search}{search}"
    
    print(test)

    
    
    


TEMP_URL = "https://api.open-meteo.com/v1/forecast?latitude=10.3333&longitude=123.75&current=temperature_2m,weather_code&timezone=Asia%2FSingapore"