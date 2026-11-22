import { create } from 'zustand'

export const MIN_ICON_POP_SPEED = 0.1
export const MAX_ICON_POP_SPEED = 3
const DEFAULT_ICON_POP_SPEED = 0.25

type AppearanceState = {
    /** Seconds an icon takes to pop in. */
    iconPopupSpeed: number
    setIconPopupSpeed: (speed: number) => void
}

export const useAppearanceStore = create<AppearanceState>((set) => ({
    iconPopupSpeed: DEFAULT_ICON_POP_SPEED,
    setIconPopupSpeed: (speed) =>
        set({
            iconPopupSpeed: Math.min(MAX_ICON_POP_SPEED, Math.max(MIN_ICON_POP_SPEED, speed)),
        }),
}))
