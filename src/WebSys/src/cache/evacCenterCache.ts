import { backend } from '../api/backendClient'
import { createCache } from './createCache'

const CACHE_TTL_MS = 180_000

/**
 * Evacuation centres change rarely, so one cached fetch serves the whole map.
 * The old version never refreshed its timestamp and read `.length` off a plain
 * object, which made it re-request on every call after three minutes.
 */
export const getEvacuationCenters = createCache(
    () => backend.getEvacuationCenters(),
    CACHE_TTL_MS,
)
