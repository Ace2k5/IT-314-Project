import { getTyphoon } from '../../cache/typhoonCache'
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { TyphoonEvent } from '../../types/api'
import type { HullByIntensity } from './MapView'

/** Wind field classes the map draws outlines for. */
const RELEVANT_WIND_FIELDS: readonly number[] = [60, 90, 120]

const ANIMATION_DURATION_MS = 4000

function collectHulls(events: TyphoonEvent[]): HullByIntensity {
    const hulls = new Map<number, [number, number][]>()
    for (const event of events) {
        if (event.hull) {
            hulls.set(60, event.hull)
        }
        for (const field of event.wind_fields ?? []) {
            if (!RELEVANT_WIND_FIELDS.includes(field.intensity)) continue
            if (!field.hull) continue
            hulls.set(field.intensity, field.hull)
        }
    }
    return hulls
}

function eventLabel(event: TyphoonEvent): string {
    const date = event.initialdate ?? 'unknown'
    const name = event.description ?? `Event ${event.eventid}`
    return `${date} — ${name.slice(0, 80)}`
}

/** Compass bearing from p0 to p1, 0 = north and clockwise. */
function bearingDeg(p0: [number, number], p1: [number, number]): number {
    const [lat1, lon1] = p0
    const [lat2, lon2] = p1
    if (lat1 === lat2 && lon1 === lon2) return 0

    const phi1 = (lat1 * Math.PI) / 180
    const phi2 = (lat2 * Math.PI) / 180
    const delta = ((lon2 - lon1) * Math.PI) / 180
    const y = Math.sin(delta) * Math.cos(phi2)
    const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(delta)
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export function TyphoonMarkers({
    setHull,
    setTrack,
    setCyclone,
}: {
    setHull: Dispatch<SetStateAction<HullByIntensity>>
    setTrack: Dispatch<SetStateAction<[number, number][] | null>>
    setCyclone: Dispatch<SetStateAction<{ position: [number, number] | null; heading: number | null }>>
}) {
    const [typhoons, setTyphoons] = useState<TyphoonEvent[]>([])
    const [selectedId, setSelectedId] = useState<number | null>(null)
    const animFrameRef = useRef<number | null>(null)
    /** Increments on every selection/clear so stale animation frames exit. */
    const runIdRef = useRef(0)
    const mountedRef = useRef(false)

    const stopAnimation = () => {
        runIdRef.current += 1
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current)
            animFrameRef.current = null
        }
    }

    const clearSelection = () => {
        stopAnimation()
        setHull(new Map())
        setTrack(null)
        setCyclone({ position: null, heading: null })
    }

    /** Draw one storm and animate its track from genesis to the last point. */
    const applyEvent = (event: TyphoonEvent) => {
        stopAnimation()
        setHull(collectHulls([event]))

        if (!Array.isArray(event.track) || event.track.length < 2) {
            console.warn(
                `[typhoon] ${event.eventid} has no track; the API response is probably stale. ` +
                'Restart the backend and hard-reload the page.',
            )
            setTrack(null)
            setCyclone({ position: null, heading: null })
            return
        }

        const leafletTrack: [number, number][] = event.track.map(([lon, lat]): [number, number] => [lat, lon])
        // eslint-disable-next-line no-console
        console.debug(`[typhoon] animating ${event.eventid} (${leafletTrack.length} points)`)
        setTrack(leafletTrack)
        setCyclone({
            position: leafletTrack[0],
            heading: bearingDeg(leafletTrack[0], leafletTrack[1]),
        })

        const runId = runIdRef.current
        let startTime: number | null = null

        const animate = (now: number) => {
            // A newer selection has superseded this run; touch nothing else.
            if (runId !== runIdRef.current) return
            // Start the clock on the first frame: if rAF is delayed (hidden
            // tab, devtools, background window) the animation still plays
            // instead of jumping straight to its final position.
            if (startTime === null) startTime = now

            const progress = Math.min((now - startTime) / ANIMATION_DURATION_MS, 1)
            const index = progress * (leafletTrack.length - 1)
            const segment = Math.floor(index)
            const fraction = index - segment

            if (segment >= leafletTrack.length - 1) {
                const last = leafletTrack[leafletTrack.length - 1]
                setCyclone({
                    position: last,
                    heading: bearingDeg(leafletTrack[leafletTrack.length - 2], last),
                })
                // eslint-disable-next-line no-console
                console.debug(`[typhoon] animation finished for ${event.eventid}`)
                animFrameRef.current = null
                return
            }

            const from = leafletTrack[segment]
            const to = leafletTrack[segment + 1]
            if (!from || !to) {
                animFrameRef.current = null
                return
            }

            const lat = from[0] + (to[0] - from[0]) * fraction
            const lng = from[1] + (to[1] - from[1]) * fraction
            setCyclone({ position: [lat, lng], heading: bearingDeg(from, to) })
            animFrameRef.current = requestAnimationFrame(animate)
        }

        animFrameRef.current = requestAnimationFrame(animate)
    }

    useEffect(() => {
        mountedRef.current = true
        void getTyphoon().then((fetched) => {
            if (!mountedRef.current) return
            setTyphoons(fetched)
            if (fetched.length > 0) {
                setSelectedId(fetched[0].eventid)
                applyEvent(fetched[0])
            }
        })
        return () => {
            mountedRef.current = false
            stopAnimation()
        }
        // The setters are stable; applyEvent only needs the fetched event.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const onChange = (eventId: number | null) => {
        setSelectedId(eventId)
        if (eventId === null) {
            clearSelection()
            return
        }
        const event = typhoons.find((e) => e.eventid === eventId)
        if (event) {
            applyEvent(event)
        } else {
            clearSelection()
        }
    }

    return (
        <select
            id="typhoon-select"
            value={selectedId ?? ''}
            onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
        >
            {typhoons.length === 0 && <option value="">Loading typhoons…</option>}
            {typhoons.map((event) => (
                <option key={event.eventid} value={event.eventid}>
                    {eventLabel(event)}
                </option>
            ))}
        </select>
    )
}
