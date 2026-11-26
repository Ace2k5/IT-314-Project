import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MIN_ICON_POP_SPEED = 0.1
export const MAX_ICON_POP_SPEED = 3
const DEFAULT_ICON_POP_SPEED = 0.25

export type FontKey = 'inter' | 'source-sans-3' | 'roboto' | 'open-sans'

/** Every font the Appearance tab can switch to, with the stack it renders with. */
export const FONT_OPTIONS: { key: FontKey; label: string; stack: string }[] = [
    {
        key: 'inter',
        label: 'Inter',
        stack: "'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
    },
    { key: 'source-sans-3', label: 'Source Sans 3', stack: "'Source Sans 3', system-ui, sans-serif" },
    { key: 'roboto', label: 'Roboto', stack: "'Roboto', system-ui, sans-serif" },
    { key: 'open-sans', label: 'Open Sans', stack: "'Open Sans', system-ui, sans-serif" },
]

export function fontStack(font: FontKey) {
    return FONT_OPTIONS.find((option) => option.key === font)?.stack ?? FONT_OPTIONS[0].stack
}

export type BasemapKey = 'openfreemap' | 'openstreetmap' | 'voyager'

export const BASEMAP_OPTIONS: { key: BasemapKey; label: string }[] = [
    { key: 'openfreemap', label: 'OpenFreeMap' },
    { key: 'openstreetmap', label: 'OpenStreetMap' },
    { key: 'voyager', label: 'Carto Voyager' },
]

type AppearanceState = {
    /** Seconds an icon takes to pop in. */
    iconPopupSpeed: number
    /** Typeface used across the interface. */
    fontFamily: FontKey
    /** Base map tiles drawn under the hazard layers. */
    basemap: BasemapKey
    setIconPopupSpeed: (speed: number) => void
    setFontFamily: (fontFamily: FontKey) => void
    setBasemap: (basemap: BasemapKey) => void
}

/** Appearance choices are not secret, so they survive a reload in localStorage. */
export const useAppearanceStore = create<AppearanceState>()(
    persist(
        (set) => ({
            iconPopupSpeed: DEFAULT_ICON_POP_SPEED,
            fontFamily: 'inter',
            basemap: 'openfreemap',
            setIconPopupSpeed: (speed) =>
                set({
                    iconPopupSpeed: Math.min(
                        MAX_ICON_POP_SPEED,
                        Math.max(MIN_ICON_POP_SPEED, speed),
                    ),
                }),
            setFontFamily: (fontFamily) => set({ fontFamily }),
            setBasemap: (basemap) => set({ basemap }),
        }),
        { name: 'disaster-watch-appearance' },
    ),
)
