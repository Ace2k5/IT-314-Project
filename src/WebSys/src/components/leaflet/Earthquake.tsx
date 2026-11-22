import { useEffect, useState } from 'react'

import { getEarthquakeEvents } from '../../cache/earthquakeCache'
import type { EarthquakeEvent, Hull } from '../../types/api'
import type { HullState } from './MapView'

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

function eventLabel(event: EarthquakeEvent): string {
    return `${event.initialdate} — ${event.description.slice(0, 80)}`
}

export function EarthquakeMarkers({ setHull }: HullState) {
    const [events, setEvents] = useState<EarthquakeEvent[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null)

    useEffect(() => {
        void getEarthquakeEvents().then((fetched) => {
            setEvents(fetched)
            if (fetched.length > 0) {
                setSelectedId(fetched[0].eventid)
            }
        })
    }, [])

    const onChange = (eventId: number | null) => {
        setSelectedId(eventId)
        if (eventId === null) {
            setHull(new Map())
            return
        }
        const event = events.find((e) => e.eventid === eventId)
        setHull(event ? collectHulls([event]) : new Map())
    }

    return (
        <select
            id="earthquake-select"
            value={selectedId ?? ''}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        >
            {events.length === 0 && <option value="">Loading earthquakes…</option>}
            {events.map((event) => (
                <option key={event.eventid} value={event.eventid}>
                    {eventLabel(event)}
                </option>
            ))}
        </select>
    )
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
