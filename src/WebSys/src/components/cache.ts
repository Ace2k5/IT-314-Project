import { BackendConnection } from "../api/receiveAPI"
type WeatherCache = {
    latitude: number;
    longitude: number;
    temperature: number;
    temperature_unit: string;
    weather: string;
    weather_icon: string;
    fetched_at: number;
};


const cache = new Map<boolean, WeatherCache>()
const timeMs = 180000
const backend = BackendConnection()

export async function getWeatherCached(is_detailed: boolean){
    const cached = cache.get(is_detailed)
    if (cached && (Date.now() - cached.fetched_at ) < timeMs) {
        backend.Log("[Frontend Cache] Time threshold did not meet, returning old cache...")
        return cached
    }
    const response = await backend.GetWeather(is_detailed)
    cache.set(is_detailed, response)
}

