import { useCallback, useSyncExternalStore } from 'react'

/** Matches the phone breakpoint documented in responsive.css. */
export const PHONE_QUERY = '(max-width: 720px)'

/**
 * Subscribes to a CSS media query. The map dock uses this to swap the floating
 * window for the compact phone controls, instead of rendering both and hiding
 * one: a hidden select or list would still sit in the accessibility tree.
 */
export function useMediaQuery(query: string): boolean {
    const subscribe = useCallback(
        (onStoreChange: () => void) => {
            const list = window.matchMedia(query)
            list.addEventListener('change', onStoreChange)
            return () => list.removeEventListener('change', onStoreChange)
        },
        [query],
    )

    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query])

    return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
