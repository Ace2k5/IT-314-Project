import { create } from 'zustand'

/** The panels that are mutually exclusive: opening one closes the other. */
export type Panel = 'overview' | 'map' | 'chat' | 'debug'

type UiState = {
    activePanel: Panel
    isSettingsOpen: boolean
    togglePanel: (panel: Panel) => void
    closePanel: () => void
    toggleSettings: () => void
    closeSettings: () => void
}

/**
 * Navigation state. Closing the active tab returns to the Overview, which is
 * also the landing tab.
 */
export const useUiStore = create<UiState>((set) => ({
    activePanel: 'overview',
    isSettingsOpen: false,
    togglePanel: (panel) =>
        set((state) => ({
            activePanel: state.activePanel === panel ? 'overview' : panel,
        })),
    closePanel: () => set({ activePanel: 'overview' }),
    toggleSettings: () => set((state) => ({ isSettingsOpen: !state.isSettingsOpen })),
    closeSettings: () => set({ isSettingsOpen: false }),
}))
