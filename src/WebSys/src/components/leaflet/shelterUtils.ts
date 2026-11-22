import type { EvacuationCenter, EvacuationCenters } from '../../types/api'

export type Origin = {
    latitude: number
    longitude: number
}

export type ShelterEntry = {
    id: string
    center: EvacuationCenter
    /** Distance from the user's location; null when the location is unknown. */
    distanceKm: number | null
}

/** Great-circle distance in kilometres. */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const radius = 6371
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLon = ((lon2 - lon1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Turn the backend map into an ordered list. With a user location this is
 * nearest-first, which is what the spacing filter and the carousel expect.
 */
export function toShelterEntries(
    centers: EvacuationCenters,
    origin: Origin | null,
): ShelterEntry[] {
    return Object.entries(centers)
        .map(([id, center]) => ({
            id,
            center,
            distanceKm: origin
                ? haversineDistance(
                      origin.latitude,
                      origin.longitude,
                      center.lat,
                      center.lon,
                  )
                : null,
        }))
        .sort((a, b) => {
            if (a.distanceKm !== null && b.distanceKm !== null) {
                return a.distanceKm - b.distanceKm
            }
            if (a.distanceKm !== null) return -1
            if (b.distanceKm !== null) return 1
            return a.center.name.localeCompare(b.center.name)
        })
}

/** Keep one shelter per cluster, so close-together pins do not clog the map. */
export function filterBySpacing(
    shelters: ShelterEntry[],
    minDistanceKm: number,
): ShelterEntry[] {
    if (minDistanceKm <= 0) return shelters

    const kept: ShelterEntry[] = []
    for (const shelter of shelters) {
        const tooClose = kept.some(
            (other) =>
                haversineDistance(
                    shelter.center.lat,
                    shelter.center.lon,
                    other.center.lat,
                    other.center.lon,
                ) < minDistanceKm,
        )
        if (!tooClose) kept.push(shelter)
    }
    return kept
}

/** Keep only shelters inside the radius around the user. */
export function filterByRadius(
    shelters: ShelterEntry[],
    radiusKm: number,
): ShelterEntry[] {
    return shelters.filter(
        (shelter) => shelter.distanceKm !== null && shelter.distanceKm <= radiusKm,
    )
}

export function formatDistanceKm(distanceKm: number | null): string {
    if (distanceKm === null || !Number.isFinite(distanceKm)) return '—'
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
    return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`
}
