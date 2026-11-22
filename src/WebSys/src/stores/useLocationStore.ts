import { create } from 'zustand'

export type UserCoords = {
    latitude: number
    longitude: number
    accuracy: number
}

export type LocationStatus = 'idle' | 'locating' | 'ready' | 'denied' | 'unavailable' | 'error'

type LocationState = {
    coords: UserCoords | null
    status: LocationStatus
    error: string | null
    requestLocation: () => Promise<UserCoords | null>
}

/** Shared so repeated clicks while the browser prompt is open do not stack. */
let inFlight: Promise<UserCoords | null> | null = null

export const useLocationStore = create<LocationState>((set) => ({
    coords: null,
    status: 'idle',
    error: null,
    requestLocation: () => {
        if (inFlight) return inFlight

        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            set({ status: 'unavailable', error: 'This browser does not support location access.' })
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
                    set({
                        status,
                        error:
                            positionError.message ||
                            'Your location could not be read. Check the browser permission.',
                    })
                    resolve(null)
                },
                { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
            )
        }).finally(() => {
            inFlight = null
        })

        return inFlight
    },
}))
