import { create } from 'zustand'

type ShelterSelection = {
    /** The shelter whose popup should be open, or null when nothing is selected. */
    selectedId: string | null
    selectShelter: (id: string | null) => void
    clearSelection: () => void
}

/** Which evacuation centre the map should highlight. */
export const useShelterStore = create<ShelterSelection>((set) => ({
    selectedId: null,
    selectShelter: (id) => set({ selectedId: id }),
    clearSelection: () => set({ selectedId: null }),
}))
