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


const timeMs = 180000
const backend = BackendConnection()
let location_cache: WeatherCache | null = null;
let region_cache: WeatherCache | null = null;
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
    backend.Log("[Frrontend Cache] Updating cache...")
    const [detailed, not_detailed] = await Promise.all([
        backend.GetWeather(true),
        backend.GetWeather(false),
    ]);
    location_cache = detailed
    region_cache = not_detailed
}



export async function getWeatherCached(is_detailed: boolean){
    await ensureInit()

    let cached: WeatherCache | null = null

    if (is_detailed) {
        cached = location_cache
    }
    else {
        cached = region_cache
    }

    if (cached && (Date.now() - cached.fetched_at ) < timeMs) {
        backend.Log("[Frontend Cache] Time threshold not exceeded, cache still valid, returning cache...")
        return cached
    }

    await updateCache()
    return cached
}

