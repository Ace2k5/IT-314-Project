import { backend } from '../api/backendClient'
import { createCache } from './createCache'
import type { Dates, EarthquakeEvent } from '../types/api'

const CACHE_TTL_MS = 180_000

/**
 * The results depend on the selected day, so each day gets its own cache slot.
 * The old single slot answered a request for February with January's events.
 */
const cachesByDay = new Map<string, () => Promise<EarthquakeEvent[] | null>>()

function toKey({ year, month, day }: Dates): string {
    return `${year}-${month}-${day}`
}

export async function getEarthquakeEvents(dates: Dates): Promise<EarthquakeEvent[]> {
    const key = toKey(dates)
    let load = cachesByDay.get(key)
    if (!load) {
        load = createCache(() => backend.getEarthquakes(dates), CACHE_TTL_MS)
        cachesByDay.set(key, load)
    }
    return (await load()) ?? []
}
