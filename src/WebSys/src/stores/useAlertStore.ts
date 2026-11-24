import { create } from 'zustand'

export type AlertKind = 'earthquake' | 'typhoon'

export type AlertOrigin = {
    latitude: number
    longitude: number
}

export type AlertStateValue = {
    kind: AlertKind
    origin: AlertOrigin
}

type AlertState = {
    alert: AlertStateValue | null
    start: (kind: AlertKind, origin: AlertOrigin) => void
    stop: () => void
}

/** The "high alert" mode shown over the whole app. */
export const useAlertStore = create<AlertState>((set) => ({
    alert: null,
    start: (kind, origin) => set({ alert: { kind, origin } }),
    stop: () => set({ alert: null }),
}))
