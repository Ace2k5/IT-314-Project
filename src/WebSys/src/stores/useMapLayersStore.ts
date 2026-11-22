import { create } from 'zustand'

type MapLayersState = {
    /** City/region weather markers on the map. */
    showWeather: boolean
    setShowWeather: (show: boolean) => void
    toggleWeather: () => void
}

export const useMapLayersStore = create<MapLayersState>((set) => ({
    showWeather: true,
    setShowWeather: (showWeather) => set({ showWeather }),
    toggleWeather: () => set((state) => ({ showWeather: !state.showWeather })),
}))
