import { backend } from '../api/backendClient'
import { createCache } from './createCache'
import type { EarthquakeEvent } from '../types/api'

const CACHE_TTL_MS = 180_000

const loadAll = createCache(backend.getEarthquakes, CACHE_TTL_MS)

export async function getEarthquakeEvents(): Promise<EarthquakeEvent[]> {
    return (await loadAll()) ?? []
}
