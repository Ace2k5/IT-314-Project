/**
 * A tiny time-to-live cache with in-flight de-duplication.
 *
 * Two problems this removes that the old per-cache copies both had: a second
 * caller during a refresh started a second HTTP request, and the cached value
 * was never keyed by what was asked for.
 */
export type Loader<T> = () => Promise<T | null>

export function createCache<T>(loader: Loader<T>, ttlMs: number): () => Promise<T | null> {
    let cached: T | null = null
    let fetchedAt = 0
    let pending: Promise<T | null> | null = null

    return async () => {
        if (cached !== null && Date.now() - fetchedAt < ttlMs) {
            return cached
        }
        if (pending) {
            return pending
        }

        const request = loader()
            .then((result) => {
                if (result !== null) {
                    cached = result
                    fetchedAt = Date.now()
                }
                return cached
            })
            .finally(() => {
                pending = null
            })

        pending = request
        return request
    }
}
