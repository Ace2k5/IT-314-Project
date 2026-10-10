import { BackendConnection } from "../api/receiveAPI"
export type WeatherKind = "sunny" | "stormy" | "rainy" | "cloudy" | "snowy"

export type WeatherEntry = {
    latitude: number
    longitude: number
    temperature: number
    temperature_unit: string
    weather: string
    weather_icon: WeatherKind
    fetched_at: number
}

export type WeatherMap = Record<string, WeatherEntry>


const timeMs = 180000
const backend = BackendConnection()
let location_cache: WeatherMap | null = null;
let region_cache: WeatherMap | null = null;
let init_promise: Promise<void> | null = null;

async function initCache(){
    backend.Log("[Frontend Cache] Initializing Cache...")
    const [detailed, not_detailed] = await Promise.all([
        backend.GetWeather(true),
        backend.GetWeather(false),
    ]);
    location_cache = detailed
    region_cache = not_detailed
    backend.Log("[Frontend Cache] Cache initialized...")
}

function ensureInit(){
    if (!init_promise) init_promise = initCache()
        return init_promise
}

async function updateCache(){
    backend.Log("[Frontend Cache] Updating cache...")
    const [detailed, not_detailed] = await Promise.all([
        backend.GetWeather(true),
        backend.GetWeather(false),
    ]);
    location_cache = detailed
    region_cache = not_detailed
}



export async function getWeatherCached(is_detailed: boolean){
    await ensureInit()

    let cached: WeatherMap | null = null

    cached = is_detailed ? location_cache : region_cache
    if (cached) {
        const anyEntry = Object.values(cached)[0]
        if (anyEntry && Date.now() - anyEntry.fetched_at < timeMs) {
            backend.Log("[Frontend Cache] Cache still valid, returning cache...")
            return cached
        }
    }

    await updateCache()
    return is_detailed ? location_cache : region_cache
}

