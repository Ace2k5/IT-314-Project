/**
 * The single place that talks HTTP to the FastAPI backend.
 *
 * Conventions:
 * - one exported `backend` object, never re-created per render;
 * - `snake_case` on the wire (Python side), converted here to the camelCase
 *   shapes in `types/api.ts`;
 * - every call resolves to `null` instead of throwing, so a backend that is not
 *   running degrades to "no data" rather than an unhandled rejection.
 */

import type {
    ChatMessage,
    Dates,
    EarthquakeEvent,
    EvacuationCenters,
    LogResponse,
    ModelInfo,
    WeatherEntry,
    WeatherKind,
    WeatherMap,
} from '../types/api'

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:9999'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type ApiCredentials = {
    api: string
    key: string
}

export type ChatRequestInput = {
    api: string
    apiKey: string
    selectedModel: string
    searchKey: string
    history: ChatMessage[]
    sessionId: string
}

type RawWeatherEntry = {
    latitude: number
    longitude: number
    temperature: number
    temperature_unit: string
    weather: string
    weather_icon: WeatherKind
}

function toWeatherMap(raw: Record<string, RawWeatherEntry> | null): WeatherMap | null {
    if (!raw) return null
    const entries = Object.entries(raw).map(([city, entry]): [string, WeatherEntry] => [
        city,
        {
            latitude: entry.latitude,
            longitude: entry.longitude,
            temperature: entry.temperature,
            temperatureUnit: entry.temperature_unit,
            weather: entry.weather,
            weatherIcon: entry.weather_icon,
        },
    ])
    return Object.fromEntries(entries)
}

async function readJson<T>(response: Response, label: string): Promise<T | null> {
    if (!response.ok) {
        console.error(`[backend] ${label} failed with status ${response.status}`)
        return null
    }
    try {
        return (await response.json()) as T
    } catch {
        console.error(`[backend] ${label} returned a body that is not JSON`)
        return null
    }
}

export const backend = {
    /** Round-trips a message to the in-memory log buffer and returns the whole log. */
    async log(message: string): Promise<LogResponse | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/log`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify({ message }),
            })
            return await readJson<LogResponse>(response, 'log')
        } catch {
            console.error('[backend] The log endpoint is unreachable.')
            return null
        }
    },

    async checkStatus(): Promise<{ text: string } | null> {
        try {
            return await readJson<{ text: string }>(await fetch(`${BACKEND_URL}/status`), 'status')
        } catch {
            console.error('[backend] The status endpoint is unreachable.')
            return null
        }
    },

    /** Detailed weather for each city (shown when zoomed in). */
    async getCityWeather(): Promise<WeatherMap | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/weather/high`)
            return toWeatherMap(await readJson<Record<string, RawWeatherEntry>>(response, 'weather/high'))
        } catch {
            console.error('[backend] The weather endpoint is unreachable.')
            return null
        }
    },

    /** A single regional reading (shown when zoomed out). */
    async getRegionWeather(): Promise<WeatherMap | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/weather/low`)
            return toWeatherMap(await readJson<Record<string, RawWeatherEntry>>(response, 'weather/low'))
        } catch {
            console.error('[backend] The weather endpoint is unreachable.')
            return null
        }
    },

    async getEarthquakes({ year, month, day }: Dates): Promise<EarthquakeEvent[] | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/weather/earthquake`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify({ year: Number(year), month: Number(month), day: Number(day) }),
            })
            return await readJson<EarthquakeEvent[]>(response, 'weather/earthquake')
        } catch {
            console.error('[backend] The earthquake endpoint is unreachable.')
            return null
        }
    },

    async getEvacuationCenters(): Promise<EvacuationCenters | null> {
        try {
            return await readJson<EvacuationCenters>(
                await fetch(`${BACKEND_URL}/shelters`),
                'shelters',
            )
        } catch {
            console.error('[backend] The shelters endpoint is unreachable.')
            return null
        }
    },

    async getModels({ api, key }: ApiCredentials): Promise<ModelInfo[] | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/models`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify({ api, key }),
            })
            return await readJson<ModelInfo[]>(response, 'models')
        } catch {
            console.error('[backend] The model list endpoint is unreachable.')
            return null
        }
    },

    /**
     * Reserved for the user-profile feature: `POST /api/save` is a stub that
     * reports `saved: false` until credentials can be tied to an account.
     */
    async saveCredentials({ api, key }: ApiCredentials): Promise<{ saved: boolean; reason?: string } | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/api/save`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify({ api, key }),
            })
            return await readJson<{ saved: boolean; reason?: string }>(response, 'api/save')
        } catch {
            console.error('[backend] The credentials endpoint is unreachable.')
            return null
        }
    },

    /**
     * Returns the raw `Response` because the body is a stream of SSE frames.
     * The caller owns reading and releasing it.
     */
    async chatCompletions(input: ChatRequestInput): Promise<Response | null> {
        try {
            return await fetch(`${BACKEND_URL}/chat/completions`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify({
                    api: input.api,
                    key: input.apiKey,
                    selected_model: input.selectedModel,
                    search_key: input.searchKey,
                    session_id: input.sessionId,
                    history: input.history.map((message) => ({
                        role: message.role,
                        content: message.content,
                    })),
                }),
            })
        } catch {
            console.error('[backend] The chat endpoint is unreachable.')
            return null
        }
    },
}
