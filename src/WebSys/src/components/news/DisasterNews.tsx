import { useEffect, useState } from 'react'

import { getCachedNews, loadDisasterNews } from '../../cache/newsCache'
import { useNewsStore } from '../../stores/useNewsStore'
import { useSettingsStore } from '../../stores/useSettingsStore'
import { useUiStore } from '../../stores/useUiStore'
import { NewsList } from './News'

function SearchIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
        </svg>
    )
}

function NewsSkeleton() {
    return (
        <div className="news-skeleton-grid" aria-hidden="true">
            {[0, 1, 2, 3].map((index) => (
                <div key={index} className="news-skeleton">
                    <span className="skeleton-line skeleton-line-sm" />
                    <span className="skeleton-line skeleton-line-lg" />
                    <span className="skeleton-line" />
                    <span className="skeleton-line skeleton-line-md" />
                </div>
            ))}
        </div>
    )
}

/**
 * Triggers the "latest disasters" search once the endpoint, model, and search
 * key are configured. The result lives in newsCache, so switching panels does
 * not fire the search again.
 */
export function DisasterNews() {
    const api = useSettingsStore((state) => state.api)
    const selectedModel = useSettingsStore((state) => state.selectedModel)
    const searchKey = useSettingsStore((state) => state.searchKey)
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)
    const openSettings = useUiStore((state) => state.toggleSettings)
    const items = useNewsStore((state) => state.items)
    const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

    const isConfigured = Boolean(api.trim() && selectedModel.trim() && searchKey.trim())
    const newsKey = `${api.trim()}|${selectedModel.trim()}|${searchKey.trim()}`

    const cached = getCachedNews(newsKey)
    const displayItems = cached ?? items
    const hasLoaded = cached !== null || status === 'done' || items.length > 0

    useEffect(() => {
        if (!isConfigured) {
            useNewsStore.getState().clearNews()
            return
        }
        if (isSettingsOpen || getCachedNews(newsKey) !== null) return

        let cancelled = false
        useNewsStore.getState().clearNews()
        void loadDisasterNews(newsKey).then(() => {
            if (!cancelled) setStatus('done')
        })

        return () => {
            cancelled = true
        }
    }, [isConfigured, isSettingsOpen, newsKey])

    const requestNews = () => {
        if (!isConfigured || isSettingsOpen) return

        setStatus('loading')
        useNewsStore.getState().clearNews()
        void loadDisasterNews(newsKey, true).then(() => setStatus('done'))
    }

    if (!isConfigured) {
        return (
            <div className="news-empty">
                <span className="news-empty-icon">
                    <SearchIcon />
                </span>
                <div className="news-empty-body">
                    <p>
                        News loads after you set an endpoint, a model, and a Search API key in
                        Settings.
                    </p>
                    <button type="button" className="news-empty-btn" onClick={openSettings}>
                        Open Settings
                    </button>
                </div>
            </div>
        )
    }

    if (status === 'loading' && displayItems.length === 0) return <NewsSkeleton />

    if (displayItems.length > 0) return <NewsList items={displayItems} />

    if (hasLoaded) {
        return (
            <div className="news-empty">
                <span className="news-empty-icon">
                    <SearchIcon />
                </span>
                <div className="news-empty-body">
                    <p>No disaster stories came back from the search.</p>
                    <button type="button" className="news-empty-btn" onClick={requestNews}>
                        Refresh
                    </button>
                </div>
            </div>
        )
    }

    return <NewsSkeleton />
}
