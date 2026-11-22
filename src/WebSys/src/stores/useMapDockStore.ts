import { create } from 'zustand'

export type MapPanel = 'earthquake' | 'typhoon' | 'shelter'

type MapDockState = {
    openPanel: MapPanel | null
    setPanel: (panel: MapPanel | null) => void
    closePanel: () => void
}

/**
 * Which floating map window is open. This lives outside MapView so the
 * Overview can ask the map to open the Shelters window on a specific event.
 */
export const useMapDockStore = create<MapDockState>((set) => ({
    openPanel: null,
    setPanel: (panel) => set({ openPanel: panel }),
    closePanel: () => set({ openPanel: null }),
}))
