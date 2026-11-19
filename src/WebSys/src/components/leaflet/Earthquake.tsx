import { useState } from 'react'

import { getEarthquakeEvents } from '../../cache/earthquakeCache'
import type { Dates, EarthquakeEvent, Hull } from '../../types/api'
import type { HullState } from './MapView'

/** The three intensities the map draws outlines for. */
const RELEVANT_INTENSITIES: readonly number[] = [4, 6, 8]

const EARLIEST_DATE = '2016-01-01'

function today(): string {
    return new Date().toISOString().slice(0, 10)
}

function parseDate(value: string): Dates | null {
    const [year, month, day] = value.split('-')
    if (!year || !month || !day) return null
    return { year, month, day }
}

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

export function EarthquakeDatePicker({ setHull }: HullState) {
    const [date, setDate] = useState('')

    const onChange = (value: string) => {
        setDate(value)
        const dates = parseDate(value)
        if (!dates) return

        void getEarthquakeEvents(dates).then((events) => {
            // Always replace the hulls: a day without intensities 4/6/8 must clear
            // the outlines left over from the previously selected day.
            setHull(collectHulls(events))
        })
    }

    return (
        <input
            id="earthquake-date"
            type="date"
            value={date}
            min={EARLIEST_DATE}
            max={today()}
            onChange={(event) => onChange(event.target.value)}
        />
    )
}

/** Manual inspection of the raw events; handy when the hulls look wrong. */
export function EarthquakeDebug() {
    const [date, setDate] = useState('')
    const [events, setEvents] = useState<EarthquakeEvent[]>([])

    const onChange = async (value: string) => {
        setDate(value)
        const dates = parseDate(value)
        if (!dates) return
        setEvents(await getEarthquakeEvents(dates))
    }

    return (
        <div className="earthquake-debug">
            <label htmlFor="earthquake-debug-date">Debug: raw events</label>
            <input
                id="earthquake-debug-date"
                type="date"
                value={date}
                min={EARLIEST_DATE}
                max={today()}
                onChange={(event) => {
                    void onChange(event.target.value)
                }}
            />
            <pre>{JSON.stringify(events, null, 2)}</pre>
        </div>
    )
}
