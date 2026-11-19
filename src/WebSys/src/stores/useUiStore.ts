import { create } from 'zustand'

/** The panels that are mutually exclusive: opening one closes the other. */
export type Panel = 'map' | 'chat' | 'debug'

type UiState = {
    activePanel: Panel | null
    isSettingsOpen: boolean
    togglePanel: (panel: Panel) => void
    closePanel: () => void
    toggleSettings: () => void
    closeSettings: () => void
}

/**
 * Navigation state. Replaces the `open` / `setOpen` props that used to be
 * threaded from `App` through every toolbar button.
 */
export const useUiStore = create<UiState>((set) => ({
    activePanel: null,
    isSettingsOpen: false,
    togglePanel: (panel) =>
        set((state) => ({ activePanel: state.activePanel === panel ? null : panel })),
    closePanel: () => set({ activePanel: null }),
    toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    closeSettings: () => set({ isSettingsOpen: false }),
}))
