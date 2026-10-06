type Dates = {
    year: number,
    month: number,
    day: number
}

interface WeatherResponse {
                "latitude": number,
                "longitude": number,
                "temperature": number,
                "temperature_unit": string,
                "weather": string,
                "weather_icon": string,
                "fetched_at": number
}

export const BackendConnection = () => ({
    CheckStatus: async () => {
        const response = await fetch("http://localhost:9999/status")
        if (!response){
            console.log("[Frontend] Was not able to get a response from the backend.")
            return null
        }
        BackendConnection().Log("OK")
        return await response.json()
    },
    Log: async (message: string) => {
        const response = await fetch("http://localhost:9999/log", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({"key": message})
        })
        if (!response){
            console.log("[Frontend] Could not access log api.")
            return null
        }
        console.log(`OK`)
        return await response.json()
    },
    GetWeather: async (is_detailed: Boolean) => {
        const response = await fetch("http://localhost:9999/weather", {
            method: "POST",
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({is_detailed: is_detailed})
        })
        if (!response){
            BackendConnection().Log("[Frontend] Failed to get weather information.")
        }
        else{
            BackendConnection().Log(`[Frontend] OK: Weather`)
            console.log(`[Frontend] OK: Weather`)
        }
        return await (response.json()) as WeatherResponse;
    },
    GetEarthquake: async ({year, month, day}: Dates) => {
        const response = await fetch("http://localhost:9999/earthquake", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"year": year, "month": month, "day": day})
            }
        )
        if (!response){
            BackendConnection().Log("[Frontend] Failed to get earthquake information.")
        }
        else {
            BackendConnection().Log("[Frontend] OK: Earthquake")
            console.log("OK: Earthquake")
        }
        return await response.json()
    }



})