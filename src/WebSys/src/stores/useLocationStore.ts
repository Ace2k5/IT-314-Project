import { create } from 'zustand'

export type LocationSource = 'auto' | 'manual'

export type UserCoords = {
    latitude: number
    longitude: number
    accuracy: number
    /** Where the fix came from: the browser, or a pin the user placed. */
    source: LocationSource
}

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'error'

type LocationState = {
    coords: UserCoords | null
    status: LocationStatus
    error: string | null
    requestLocation: () => Promise<UserCoords | null>
    setManualLocation: (latitude: number, longitude: number) => void
}

const MANUAL_LOCATION_KEY = 'disaster-watch-manual-location'

/** A manually picked pin survives a reload; an automatic fix does not. */
function readManualLocation(): UserCoords | null {
    try {
        const raw = window.localStorage.getItem(MANUAL_LOCATION_KEY)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null) return null
        const { latitude, longitude } = parsed as { latitude?: unknown; longitude?: unknown }
        if (typeof latitude !== 'number' || !Number.isFinite(latitude)) return null
        if (typeof longitude !== 'number' || !Number.isFinite(longitude)) return null
        return { latitude, longitude, accuracy: 0, source: 'manual' }
    } catch {
        return null
    }
}

const storedManual = readManualLocation()

/** Shared so repeated clicks while the browser prompt is open do not stack. */
let inFlight: Promise<UserCoords | null> | null = null

export const useLocationStore = create<LocationState>((set) => ({
    coords: storedManual,
    status: storedManual ? 'ready' : 'idle',
    error: null,
    requestLocation: () => {
        if (inFlight) return inFlight

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            set((state) => ({
                status: state.coords ? 'ready' : 'unavailable',
                error: 'This browser does not support location access.',
            }))
            return Promise.resolve(null)
        }

        set({ status: 'locating', error: null })

        inFlight = new Promise<UserCoords | null>((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords: UserCoords = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        source: 'auto',
                    }
                    try {
                        window.localStorage.removeItem(MANUAL_LOCATION_KEY)
                    } catch {
                        // Blocked storage is not fatal: the new fix still applies.
                    }
                    set({ coords, status: 'ready', error: null })
                    resolve(coords)
                },
                (positionError) => {
                    const status: LocationStatus =
                        positionError.code === 1
                            ? 'denied'
                            : positionError.code === 2
                              ? 'unavailable'
                              : 'error'
                    // An existing manual pin stays usable when a retry fails.
                    set((state) => ({
                        status: state.coords ? 'ready' : status,
                        error:
                            positionError.message ||
                            'Your location could not be read. Check the browser permission.',
                    }))
                    resolve(null)
                },
                { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
            )
        }).finally(() => {
            inFlight = null
        })

        return inFlight
    },
    setManualLocation: (latitude, longitude) => {
        try {
            window.localStorage.setItem(
                MANUAL_LOCATION_KEY,
                JSON.stringify({ latitude, longitude }),
            )
        } catch {
            // The pin still works for this session when storage is blocked.
        }
        set({
            coords: { latitude, longitude, accuracy: 0, source: 'manual' },
            status: 'ready',
            error: null,
        })
    },
}))
