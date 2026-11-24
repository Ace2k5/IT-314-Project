import type { NewsItem } from '../types/api'
import { NEWS_QUERY, sendChatMessage } from '../services/chatStream'

/**
 * Module-level news cache.
 *
 * The disaster-news block is rendered on both the Overview and the Map. Without
 * this, every tab switch remounted the component and fired another search.
 * One cache per settings fingerprint keeps the result for the whole session;
 * "Refresh" explicitly bypasses it.
 */
const SESSION_ID = crypto.randomUUID()

let cachedKey: string | null = null
let cachedItems: NewsItem[] | null = null
let pending: { key: string; promise: Promise<NewsItem[]> } | null = null

export function getCachedNews(key: string): NewsItem[] | null {
    return cachedKey === key ? cachedItems : null
}

export function loadDisasterNews(key: string, force = false): Promise<NewsItem[]> {
    if (pending?.key === key) return pending.promise
    if (!force && cachedKey === key && cachedItems !== null) {
        return Promise.resolve(cachedItems)
    }

    const promise = sendChatMessage(NEWS_QUERY, SESSION_ID)
        .then((items) => {
            cachedKey = key
            cachedItems = items
            return items
        })
        .finally(() => {
            if (pending?.promise === promise) pending = null
        })

    pending = { key, promise }
    return promise
}
