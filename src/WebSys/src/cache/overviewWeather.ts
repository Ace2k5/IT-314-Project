import { backend } from '../api/backendClient'
import type { LocationForecast } from '../types/api'

/** Same three-minute window as the other weather caches. */
const TTL_MS = 180_000

export type OverviewWeather = LocationForecast & {
    /** Lowest current temperature observed since the first reading. */
    min: number
    /** Highest current temperature observed since the first reading. */
    max: number
    /** When the latest reading was taken. */
    fetchedAt: number
}

type WeatherSession = {
    key: string
    min: number
    max: number
    fetchedAt: number
    data: LocationForecast
}

/**
 * Module-level, deliberately not component state: leaving and returning to the
 * Overview keeps the observed min/max for the same location. After three
 * minutes the next call fetches again and folds the new reading into min/max.
 */
let session: WeatherSession | null = null
let pending: { key: string; promise: Promise<OverviewWeather | null> } | null = null

function locationKey(latitude: number, longitude: number): string {
    return `${latitude.toFixed(3)}:${longitude.toFixed(3)}`
}

function snapshot(current: WeatherSession): OverviewWeather {
    return {
        ...current.data,
        min: current.min,
        max: current.max,
        fetchedAt: current.fetchedAt,
    }
}

async function loadOverviewWeather(
    latitude: number,
    longitude: number,
    key: string,
): Promise<OverviewWeather | null> {
    const now = Date.now()

    if (session && session.key === key && now - session.fetchedAt < TTL_MS) {
        return snapshot(session)
    }

    const data = await backend.getLocationWeather(latitude, longitude)
    if (!data) {
        return session && session.key === key ? snapshot(session) : null
    }

    const temperature = data.current.temperature
    if (!Number.isFinite(temperature)) {
        return session && session.key === key ? snapshot(session) : null
    }

    if (!session || session.key !== key) {
        session = { key, min: temperature, max: temperature, fetchedAt: now, data }
    } else {
        session = {
            key,
            min: Math.min(session.min, temperature),
            max: Math.max(session.max, temperature),
            fetchedAt: now,
            data,
        }
    }

    return snapshot(session)
}

export function getOverviewWeather(
    latitude: number,
    longitude: number,
): Promise<OverviewWeather | null> {
    const key = locationKey(latitude, longitude)

    if (pending && pending.key === key) {
        return pending.promise
    }

    const promise = loadOverviewWeather(latitude, longitude, key)
    pending = { key, promise }
    void promise.finally(() => {
        if (pending?.promise === promise) pending = null
    })

    return promise
}
