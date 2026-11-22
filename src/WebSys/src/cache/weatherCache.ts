import { backend } from '../api/backendClient'
import { createCache } from './createCache'
import type { WeatherMap } from '../types/api'

const CACHE_TTL_MS = 180_000

/**
 * Cities that stand in for their region when the map is zoomed out.
 *
 * The backend ships one payload holding every city, so this split is a
 * presentation choice rather than a second request. That is why the list lives
 * here, next to the cache, and not inside a component.
 */
const REGION_NAMES: readonly string[] = ['Manila']

/** The single cached request every accessor below reads from. */
const getWeatherMap = createCache(() => backend.getWeather(), CACHE_TTL_MS)

/**
 * Narrow a full payload to the region representatives.
 *
 * Returns an empty map, not null, when nothing matches: an empty map simply
 * renders no markers, so callers never have to branch on the result.
 */
export function pickRegions(weather: WeatherMap): WeatherMap {
    return Object.fromEntries(
        Object.entries(weather).filter(([city]) => REGION_NAMES.includes(city)),
    )
}

/** Every city, for the zoomed in view. Never null; empty means unavailable. */
export async function getCityWeather(): Promise<WeatherMap> {
    return (await getWeatherMap()) ?? {}
}

/** Only the region representatives, for the zoomed out view. */
export async function getRegionalWeather(): Promise<WeatherMap> {
    return pickRegions(await getCityWeather())
}
