import { useEffect, useState } from 'react'
import { Polyline } from 'react-leaflet'

import { getEarthquakeEvents } from '../../cache/earthquakeCache'
import type { EarthquakeEvent, Hull } from '../../types/api'

/** The three intensities the map draws outlines for. */
const RELEVANT_INTENSITIES: readonly number[] = [4, 6, 8]

function collectHulls(events: EarthquakeEvent[]): Map<number, Hull> {
    const hulls = new Map<number, Hull>()
    for (const event of events) {
        for (const intensity of event.intensities ?? []) {
            if (!RELEVANT_INTENSITIES.includes(intensity.intensity)) continue
            if (!intensity.hull) continue
            hulls.set(intensity.intensity, intensity.hull)
        }
    }
    return hulls
}

/**
 * Draws one selected earthquake. Nothing is rendered until MapView has a
 * selected event, so the map has no hazard overlay on its own.
 */
export function EarthquakeMarkers({ event }: { event: EarthquakeEvent | null }) {
    if (!event) return null

    const hulls = collectHulls([event])

    return (
        <>
            {Array.from(hulls.entries()).map(([intensity, points]) => (
                <Polyline
                    key={`eq-${intensity}`}
                    positions={points.map(([lon, lat]): [number, number] => [lat, lon])}
                    pathOptions={{ color: 'red', weight: 3 }}
                />
            ))}
        </>
    )
}

function eventLabel(event: EarthquakeEvent): string {
    return `${event.initialdate} — ${event.description.slice(0, 80)}`
}

/** Manual inspection of the raw events; handy when the hulls look wrong. */
export function EarthquakeDebug() {
    const [events, setEvents] = useState<EarthquakeEvent[]>([])

    useEffect(() => {
        void getEarthquakeEvents().then(setEvents)
    }, [])

    return (
        <div className="earthquake-debug">
            <label htmlFor="earthquake-debug-select">Debug: raw events</label>
            <select
                id="earthquake-debug-select"
                value={events.length > 0 ? events[0].eventid : ''}
                onChange={(event) => {
                    const chosen = events.find((e) => e.eventid === Number(event.target.value))
                    setEvents(chosen ? [chosen] : [])
                }}
            >
                {events.length === 0 && <option value="">Loading…</option>}
                {events.map((event) => (
                    <option key={event.eventid} value={event.eventid}>
                        {eventLabel(event)}
                    </option>
                ))}
            </select>
            <pre>{JSON.stringify(events, null, 2)}</pre>
        </div>
    )
}
