import { create } from 'zustand'

import { getEvacuationCenters } from '../cache/evacCenterCache'
import type { EvacuationCenters } from '../types/api'

type ShelterDataState = {
    centers: EvacuationCenters | null
    ready: boolean
    loading: boolean
    loadShelters: () => Promise<void>
}

/**
 * The fetched shelter set, shared by the map markers and the dock carousel.
 * The filtered/derived list lives in useShelterEntries.
 */
export const useShelterDataStore = create<ShelterDataState>((set, get) => ({
    centers: null,
    ready: false,
    loading: false,
    loadShelters: async () => {
        if (get().ready || get().loading) return

        set({ loading: true })
        try {
            const centers = await getEvacuationCenters()
            set({ centers: centers ?? {}, ready: true, loading: false })
        } catch {
            set({ centers: {}, ready: true, loading: false })
        }
    },
}))
