import type { BBox, Coordinate, EarthquakeEvent, Hull, Intensity, TyphoonEvent } from '../types/api'

const METERS_PER_DEGREE = 111_320
const KM_PER_DEGREE = 111.32

export type SimulationOrigin = {
    latitude: number
    longitude: number
}

/** Used when the user has not given a location yet, so the demo still runs. */
export const FALLBACK_ORIGIN: SimulationOrigin = { latitude: 14.5995, longitude: 120.9842 }

/** A random point within roughly `meters` of the origin. */
export function jitterNearby(origin: SimulationOrigin, meters = 100): SimulationOrigin {
    const latDelta = (Math.random() * 2 - 1) * (meters / METERS_PER_DEGREE)
    const lonScale = Math.cos((origin.latitude * Math.PI) / 180)
    const lonDelta = (Math.random() * 2 - 1) * (meters / (METERS_PER_DEGREE * lonScale))
    return {
        latitude: origin.latitude + latDelta,
        longitude: origin.longitude + lonDelta,
    }
}

function circleHull(latitude: number, longitude: number, radiusKm: number): Hull {
    const segments = 32
    const latRadius = radiusKm / KM_PER_DEGREE
    const lonRadius = radiusKm / (KM_PER_DEGREE * Math.cos((latitude * Math.PI) / 180))
    const hull: Hull = []
    for (let index = 0; index < segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2
        hull.push([
            longitude + Math.cos(angle) * lonRadius,
            latitude + Math.sin(angle) * latRadius,
        ])
    }
    hull.push(hull[0])
    return hull
}

function bboxOf(hull: Hull): BBox {
    let west = Infinity
    let south = Infinity
    let east = -Infinity
    let north = -Infinity
    for (const [lon, lat] of hull) {
        west = Math.min(west, lon)
        south = Math.min(south, lat)
        east = Math.max(east, lon)
        north = Math.max(north, lat)
    }
    return [west, south, east, north]
}

function zone(level: number, radiusKm: number, origin: SimulationOrigin): Intensity {
    const hull = circleHull(origin.latitude, origin.longitude, radiusKm)
    return {
        intensity: level,
        radius_km: radiusKm,
        width: radiusKm * 2,
        height: radiusKm * 2,
        bbox: bboxOf(hull),
        hull,
    }
}

export function createSimulatedEarthquake(origin: SimulationOrigin): EarthquakeEvent {
    const now = new Date().toISOString()
    return {
        eventid: -Date.now(),
        description: 'Simulated magnitude 6.2 earthquake near your location',
        severity: 6.2,
        severitytext: 'M 6.2',
        alertlevel: 'Orange',
        initialdate: now,
        enddate: now,
        intensities: [zone(4, 4, origin), zone(6, 2.5, origin), zone(8, 1.4, origin)],
    }
}

export function createSimulatedTyphoon(origin: SimulationOrigin): TyphoonEvent {
    const now = new Date().toISOString()
    const hull = circleHull(origin.latitude, origin.longitude, 3)
    const center: Coordinate = [origin.longitude, origin.latitude]
    const track: Coordinate[] = [
        [origin.longitude - 0.012, origin.latitude - 0.004],
        center,
    ]
    return {
        eventid: -Date.now(),
        description: 'Simulated typhoon near your location',
        severity: 120,
        severitytext: 'TY 120',
        alertlevel: 'Red',
        initialdate: now,
        enddate: now,
        center,
        position: center,
        radius_km: 3,
        bbox: bboxOf(hull),
        hull,
        timestamp: now,
        wind_fields: [zone(60, 2.5, origin), zone(90, 1.5, origin), zone(120, 0.8, origin)],
        track,
        track_times: null,
        heading_deg: 70,
    }
}
