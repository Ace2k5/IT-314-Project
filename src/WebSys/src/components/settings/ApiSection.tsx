import { useState } from 'react'
import type { FormEvent } from 'react'

import { backend } from '../../api/backendClient'
import { useSettingsStore } from '../../stores/useSettingsStore'
import type { SettingsSection } from './sections'
import './ApiSection.css'

type SectionButtonProps = {
    activeSection: SettingsSection
    setActiveSection: (section: SettingsSection) => void
}

export function ApiSectionButton({ activeSection, setActiveSection }: SectionButtonProps) {
    return (
        <button
            type="button"
            className={`btn-sidebar${activeSection === 'api' ? ' active' : ''}`}
            onClick={() => setActiveSection('api')}
        >
            <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <circle cx="8" cy="12" r="3.5" />
                <path d="M11.5 12H20M17 12v3M20 12v2" />
            </svg>
            <span>API</span>
        </button>
    )
}

export function ApiSection() {
    const api = useSettingsStore((state) => state.api)
    const apiKey = useSettingsStore((state) => state.apiKey)
    const searchKey = useSettingsStore((state) => state.searchKey)
    const selectedModel = useSettingsStore((state) => state.selectedModel)
    const models = useSettingsStore((state) => state.models)
    const setApi = useSettingsStore((state) => state.setApi)
    const setApiKey = useSettingsStore((state) => state.setApiKey)
    const setSearchKey = useSettingsStore((state) => state.setSearchKey)
    const setSelectedModel = useSettingsStore((state) => state.setSelectedModel)
    const setModels = useSettingsStore((state) => state.setModels)

    const [status, setStatus] = useState('')
    const [isConnecting, setIsConnecting] = useState(false)

    const connect = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsConnecting(true)
        setStatus('')

        const fetched = await backend.getModels({ api, key: apiKey })
        setIsConnecting(false)

        if (!fetched) {
            setStatus('Could not read the model list. Check the endpoint and the key.')
            return
        }
        setModels(fetched)
        setStatus(
            fetched.length === 0
                ? 'The endpoint answered but listed no models.'
                : `Loaded ${fetched.length} model(s).`,
        )
    }

    return (
        <form className="model-api" onSubmit={connect}>
            <h2>API Configuration</h2>
            <p className="section-description">
                Connect an OpenAI-compatible endpoint, then pick the model to use.
            </p>

            <div className="input-group">
                <label htmlFor="endpoint">Endpoint</label>
                <input
                    id="endpoint"
                    type="text"
                    placeholder="https://example.com/api"
                    value={api}
                    onChange={(event) => setApi(event.target.value)}
                />
            </div>

            <div className="input-group">
                <label htmlFor="api-key">API Key</label>
                <input
                    id="api-key"
                    type="password"
                    placeholder="Optional for a local endpoint"
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                />
            </div>

            <div className="input-group">
                <label htmlFor="search-key">Search API Key</label>
                <input
                    id="search-key"
                    type="text"
                    placeholder="Leave empty to use TAVILY_API_KEY from the server .env"
                    value={searchKey}
                    onChange={(event) => setSearchKey(event.target.value)}
                />
            </div>

            <button className="connect-btn" type="submit" disabled={isConnecting}>
                {isConnecting ? 'Connecting...' : 'Connect'}
            </button>

            {status ? <p className="connect-status">{status}</p> : null}

            <div className="model-box">
                {models.map((model) => (
                    <button
                        key={model.id}
                        type="button"
                        className={`model-item${selectedModel === model.id ? ' active' : ''}`}
                        onClick={() => setSelectedModel(model.id)}
                    >
                        {model.id}
                    </button>
                ))}
            </div>
        </form>
    )
}
