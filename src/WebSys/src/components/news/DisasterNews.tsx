import { useCallback, useEffect, useRef, useState } from 'react'

import { NEWS_QUERY, sendChatMessage } from '../../services/chatStream'
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
 * key are configured. Waiting until Settings is closed avoids firing a request
 * on every keystroke while the key is being typed.
 */
export function DisasterNews() {
    const [sessionId] = useState(() => crypto.randomUUID())
    const api = useSettingsStore((state) => state.api)
    const selectedModel = useSettingsStore((state) => state.selectedModel)
    const searchKey = useSettingsStore((state) => state.searchKey)
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)
    const openSettings = useUiStore((state) => state.toggleSettings)
    const items = useNewsStore((state) => state.items)
    const requested = useRef<string | null>(null)
    const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

    const isConfigured = Boolean(api.trim() && selectedModel.trim() && searchKey.trim())
    const fingerprint = `${api.trim()}|${selectedModel.trim()}|${searchKey.trim()}`

    const requestNews = useCallback(() => {
        if (!isConfigured || isSettingsOpen) return

        requested.current = fingerprint
        useNewsStore.getState().clearNews()
        setStatus('loading')
        void sendChatMessage(NEWS_QUERY, sessionId).finally(() => setStatus('done'))
    }, [fingerprint, isConfigured, isSettingsOpen, sessionId])

    useEffect(() => {
        if (!isConfigured) {
            requested.current = null
            useNewsStore.getState().clearNews()
            return
        }
        if (isSettingsOpen || requested.current === fingerprint) return
        requestNews()
    }, [fingerprint, isConfigured, isSettingsOpen, requestNews])

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

    if (items.length > 0) return <NewsList />

    if (status === 'done') {
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
