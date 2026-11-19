import { backend } from '../api/backendClient'
import { createCache } from './createCache'

const CACHE_TTL_MS = 180_000

/** Detailed weather per city; the map shows this above `DETAILED_ZOOM`. */
export const getCityWeather = createCache(() => backend.getCityWeather(), CACHE_TTL_MS)

/** One regional reading; the map shows this below `DETAILED_ZOOM`. */
export const getRegionalWeather = createCache(() => backend.getRegionWeather(), CACHE_TTL_MS)
