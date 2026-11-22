import { backend } from '../api/backendClient'
import { createCache } from './createCache'
import type { TyphoonEvent } from '../types/api'

const CACHE_TTL_MS = 180_000

const loadAll = createCache(backend.getTyphoon, CACHE_TTL_MS)

export async function getTyphoon(): Promise<TyphoonEvent[]> {
    return (await loadAll()) ?? []
}
