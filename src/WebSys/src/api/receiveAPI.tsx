import type { WeatherMap } from "../cache/CacheWeather"
import type { Dates } from "../cache/CacheEarthquake"
import type { APIProps } from "../components/settings/apisection"

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
    GetWeatherLow: async () => {
        const response = await fetch("http://localhost:9999/weather/low")
        if (!response){
            BackendConnection().Log("[Frontend] Failed to get weather information.")
        }
        else{
            BackendConnection().Log(`[Frontend] OK: Weather`)
            console.log(`[Frontend] OK: Weather`)
        }
        return await (response.json()) as WeatherMap;
    },
    GetWeatherHigh: async () => {
        const response = await fetch("http://localhost:9999/weather/high")
        if (!response){
            BackendConnection().Log("[Frontend] Failed to get weather information.")
        }
        else{
            BackendConnection().Log(`[Frontend] OK: Weather`)
            console.log(`[Frontend] OK: Weather`)
        }
        return await (response.json()) as WeatherMap;
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
    },
    SaveModelAPI: async ({api, key}: APIProps) => {
        const response = await fetch("http://localhost:9999/save-api",{
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"api": api, "key": key})
        })
        if (!response.ok){
            BackendConnection().Log("[Frontend] Failed to save API key.")
        }
        return await response.json()
    },
    GetModel: async ({api, key}: APIProps) => {
        const response = await fetch("http://localhost:9999/get-models", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({"api": api, "key": key})
            }
        )
        if (!response.ok){
            BackendConnection().Log("[Frontend] Could not fetch models")
        }
        return await response.json()
    }


})