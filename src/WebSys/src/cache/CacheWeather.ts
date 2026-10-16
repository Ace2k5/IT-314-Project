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
let location_cache: WeatherMap | null = null
let region_cache: WeatherMap | null = null
let location_fetched_at = 0
let region_fetched_at = 0
let location_promise: Promise<void> | null = null
let region_promise: Promise<void> | null = null

async function fetchLocation() {
    backend.Log("[Weather Frontend Cache] Getting zoomed out data...")
    const data = await backend.GetWeatherHigh()
    location_cache = data
    location_fetched_at = Date.now()
}

async function fetchRegion() {
    backend.Log("[Weather Frontend Cache] Getting zoomed in data...")
    const data = await backend.GetWeatherLow()
    region_cache = data
    region_fetched_at = Date.now()
}

function ensureLocation() {
    if (!location_promise) {
        location_promise = fetchLocation().finally(() => { location_promise = null })
    }
    return location_promise
}

function ensureRegion() {
    if (!region_promise) {
        region_promise = fetchRegion().finally(() => { region_promise = null })
    }
    return region_promise
}

export async function getWeatherLocation() {
    if (location_cache && Date.now() - location_fetched_at < timeMs) return location_cache
    await ensureLocation()
    backend.Log("[Weather Frontend Cache] Zoomed out data returned cleanly.")
    return location_cache
}

export async function getWeatherRegion() {
    if (region_cache && Date.now() - region_fetched_at < timeMs) return region_cache
    await ensureRegion()
    backend.Log("[Weather Frontend Cache] Zoomed in data returned cleanly.")
    return region_cache
}

