import { create } from 'zustand'

export type RouteTarget = {
    /** Namespaced id, so closing one marker's popup cannot clear another's route. */
    id: string
    latitude: number
    longitude: number
}

type RouteState = {
    target: RouteTarget | null
    setTarget: (target: RouteTarget) => void
    /** Clear the route, but only when it belongs to this id (or when no id is given). */
    clearTarget: (id?: string) => void
}

export const useRouteStore = create<RouteState>((set) => ({
    target: null,
    setTarget: (target) => set({ target }),
    clearTarget: (id) =>
        set((state) => ({
            target: id && state.target?.id !== id ? state.target : null,
        })),
}))
