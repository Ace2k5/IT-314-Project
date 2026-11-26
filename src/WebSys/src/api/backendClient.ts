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
    EarthquakeEvent,
    EvacuationCenters,
    LocationForecast,
    LogResponse,
    ModelInfo,
    TyphoonEvent,
    WeatherEntry,
    WeatherKind,
    WeatherMap,
} from '../types/api'

export type RegisterRequest = {
    username: string
    password: string
    api: string
    api_key: string
    search_key: string
}

export type LoginRequest = {
    username: string
    password: string
}

export type AuthResult = {
    success: boolean
    error?: string
    username?: string
    api?: string
    api_key?: string
    search_key?: string
}

const BACKEND_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:9999'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

export type ApiCredentials = {
    api: string
    key: string
}

/** [latitude, longitude] pairs ready for a Leaflet Polyline. */
export type RouteResult = {
    coordinates: [number, number][]
    distanceM: number
    durationS: number
}

type RawRoute = {
    coordinates?: [number, number][]
    distance_m?: number
    duration_s?: number
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

type RawForecastDay = {
    date: string
    temperature_max: number
    temperature_min: number
    weather: number
    weather_icon: WeatherKind
}

type RawLocationForecast = {
    latitude: number
    longitude: number
    timezone: string
    place: string | null
    current: {
        temperature: number
        temperature_unit: string
        weather: number
        weather_icon: WeatherKind
    }
    daily: RawForecastDay[]
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
    async getWeather(): Promise<WeatherMap | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/weather`)
            return toWeatherMap(await readJson<Record<string, RawWeatherEntry>>(response, 'weather'))
        } catch {
            console.error('[backend] The weather endpoint is unreachable.')
            return null
        }
    },

    /** Current conditions and the forecast for an arbitrary user location. */
    async getLocationWeather(latitude: number, longitude: number): Promise<LocationForecast | null> {
        try {
            const params = new URLSearchParams({
                latitude: String(latitude),
                longitude: String(longitude),
            })
            const response = await fetch(`${BACKEND_URL}/weather/location?${params.toString()}`)
            const raw = await readJson<RawLocationForecast>(response, 'weather/location')
            if (!raw || !raw.current || !Array.isArray(raw.daily)) return null

            return {
                latitude: raw.latitude,
                longitude: raw.longitude,
                timezone: raw.timezone,
                place: raw.place,
                current: {
                    temperature: raw.current.temperature,
                    temperatureUnit: raw.current.temperature_unit,
                    weather: raw.current.weather,
                    weatherIcon: raw.current.weather_icon,
                },
                daily: raw.daily.map((day) => ({
                    date: day.date,
                    temperatureMax: day.temperature_max,
                    temperatureMin: day.temperature_min,
                    weather: day.weather,
                    weatherIcon: day.weather_icon,
                })),
            }
        } catch {
            console.error('[backend] The location weather endpoint is unreachable.')
            return null
        }
    },

    async getEarthquakes(): Promise<EarthquakeEvent[] | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/weather/earthquake`)
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

    /** Road path between two points, proxied by the backend. */
    async getRoute(
        fromLat: number,
        fromLon: number,
        toLat: number,
        toLon: number,
    ): Promise<RouteResult | null> {
        const params = new URLSearchParams({
            from_lat: String(fromLat),
            from_lon: String(fromLon),
            to_lat: String(toLat),
            to_lon: String(toLon),
        })
        try {
            const raw = await readJson<RawRoute>(
                await fetch(`${BACKEND_URL}/route?${params.toString()}`),
                'route',
            )
            if (!raw || !Array.isArray(raw.coordinates) || raw.coordinates.length === 0) {
                return null
            }
            return {
                coordinates: raw.coordinates,
                distanceM: raw.distance_m ?? 0,
                durationS: raw.duration_s ?? 0,
            }
        } catch {
            console.error('[backend] The route endpoint is unreachable.')
            return null
        }
    },

    async getTyphoon(): Promise<TyphoonEvent[] | null> {
        try {
            return await readJson<TyphoonEvent[]>(
                await fetch(`${BACKEND_URL}/weather/typhoon`),
                'typhoon',
            )
        } catch {
            console.error(`[backend] The typhoon endpoint is unreachable.`)
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

    async loginUser(request: LoginRequest): Promise<AuthResult | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/login`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify(request),
            })
            return await readJson<AuthResult>(response, 'auth/login')
        } catch {
            console.error('[backend] The login endpoint is unreachable.')
            return null
        }
    },

    async registerUser(request: RegisterRequest): Promise<AuthResult | null> {
        try {
            const response = await fetch(`${BACKEND_URL}/auth/register`, {
                method: 'POST',
                headers: JSON_HEADERS,
                body: JSON.stringify(request),
            })
            return await readJson<AuthResult>(response, 'auth/register')
        } catch {
            console.error('[backend] The register endpoint is unreachable.')
            return null
        }
    },
}
