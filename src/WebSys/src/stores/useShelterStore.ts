import { create } from 'zustand'

type ShelterState = {
    /** The shelter whose map popup should be open, or null when none is selected. */
    selectedId: string | null
    /** Minimum distance between two displayed shelters; keeps the map readable. */
    minDistanceKm: number
    /** When true, the radius filter and circle around the user are active. */
    radiusMode: boolean
    radiusKm: number
    selectShelter: (id: string | null) => void
    clearSelection: () => void
    setMinDistanceKm: (km: number) => void
    setRadiusMode: (enabled: boolean) => void
    setRadiusKm: (km: number) => void
}

export const useShelterStore = create<ShelterState>((set) => ({
    selectedId: null,
    minDistanceKm: 3,
    radiusMode: false,
    radiusKm: 10,
    selectShelter: (id) => set({ selectedId: id }),
    clearSelection: () => set({ selectedId: null }),
    setMinDistanceKm: (minDistanceKm) => set({ minDistanceKm }),
    setRadiusMode: (radiusMode) => set({ radiusMode }),
    setRadiusKm: (radiusKm) => set({ radiusKm }),
}))
