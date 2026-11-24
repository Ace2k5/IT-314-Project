import { useMemo } from 'react'

import {
    filterByRadius,
    filterBySpacing,
    toShelterEntries,
} from '../components/leaflet/shelterUtils'
import type { ShelterEntry } from '../components/leaflet/shelterUtils'
import { useLocationStore } from '../stores/useLocationStore'
import { useMapDockStore } from '../stores/useMapDockStore'
import { useShelterDataStore } from '../stores/useShelterDataStore'
import { useShelterStore } from '../stores/useShelterStore'

/**
 * The shelters as they should appear on the map and in the carousel:
 * distance-sorted, spacing-filtered, and radius-filtered while Shelters is open.
 */
export function useShelterEntries(): ShelterEntry[] {
    const centers = useShelterDataStore((state) => state.centers)
    const coords = useLocationStore((state) => state.coords)
    const openPanel = useMapDockStore((state) => state.openPanel)
    const radiusMode = useShelterStore((state) => state.radiusMode)
    const radiusKm = useShelterStore((state) => state.radiusKm)
    const minDistanceKm = useShelterStore((state) => state.minDistanceKm)

    return useMemo(() => {
        const entries = toShelterEntries(centers ?? {}, coords)
        const radiusFiltered =
            openPanel === 'shelter' && radiusMode
                ? filterByRadius(entries, radiusKm)
                : entries
        return filterBySpacing(radiusFiltered, minDistanceKm)
    }, [centers, coords, openPanel, radiusMode, radiusKm, minDistanceKm])
}
