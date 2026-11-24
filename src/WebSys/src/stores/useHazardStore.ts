import { create } from 'zustand'

import { getEarthquakeEvents } from '../cache/earthquakeCache'
import { getTyphoon } from '../cache/typhoonCache'
import type { EarthquakeEvent, TyphoonEvent } from '../types/api'

type HazardState = {
    earthquakes: EarthquakeEvent[]
    typhoons: TyphoonEvent[]
    earthquakesReady: boolean
    typhoonsReady: boolean
    loading: boolean
    selectedEarthquake: EarthquakeEvent | null
    selectedTyphoon: TyphoonEvent | null
    loadHazards: () => Promise<void>
    selectEarthquake: (event: EarthquakeEvent) => void
    selectTyphoon: (event: TyphoonEvent) => void
    clearEarthquake: () => void
    clearTyphoon: () => void
}

/**
 * Shared hazard data and selection. MapView draws the selected layers while
 * MapDock renders the picker and details, so both read this store directly.
 */
export const useHazardStore = create<HazardState>((set, get) => ({
    earthquakes: [],
    typhoons: [],
    earthquakesReady: false,
    typhoonsReady: false,
    loading: false,
    selectedEarthquake: null,
    selectedTyphoon: null,
    loadHazards: async () => {
        const state = get()
        if (state.loading || (state.earthquakesReady && state.typhoonsReady)) return

        set({ loading: true })
        const [earthquakes, typhoons] = await Promise.allSettled([
            getEarthquakeEvents(),
            getTyphoon(),
        ])

        set((current) => ({
            earthquakes:
                earthquakes.status === 'fulfilled' ? earthquakes.value : current.earthquakes,
            typhoons: typhoons.status === 'fulfilled' ? typhoons.value : current.typhoons,
            earthquakesReady:
                earthquakes.status === 'fulfilled' ? true : current.earthquakesReady,
            typhoonsReady: typhoons.status === 'fulfilled' ? true : current.typhoonsReady,
            loading: false,
        }))
    },
    selectEarthquake: (event) => set({ selectedEarthquake: event }),
    selectTyphoon: (event) => set({ selectedTyphoon: event }),
    clearEarthquake: () => set({ selectedEarthquake: null }),
    clearTyphoon: () => set({ selectedTyphoon: null }),
}))
