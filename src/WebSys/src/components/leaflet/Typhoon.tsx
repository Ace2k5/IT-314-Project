import { useEffect, useMemo, useRef, useState } from 'react'
import { Marker, Polyline } from 'react-leaflet'
import type { LatLngExpression } from 'leaflet'
import L from 'leaflet'

import type { TyphoonEvent } from '../../types/api'
import cycloneImg from './map_assets/cyclone.png'

/** Intensity -> hull outline, as `[longitude, latitude]` pairs. */
type HullByIntensity = Map<number, [number, number][]>

type CycloneState = {
    position: [number, number] | null
    heading: number | null
}

/** Wind field classes the map draws outlines for. */
const RELEVANT_WIND_FIELDS: readonly number[] = [60, 90, 120]

const ANIMATION_DURATION_MS = 4000

const CYCLONE_ICON = L.divIcon({
    className: 'cyclone-icon',
    html: `<img src="${cycloneImg}" alt="" style="width:32px;height:32px" />`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
})

function CycloneMarker({ position, heading }: { position: [number, number]; heading: number }) {
    const markerRef = useRef<L.Marker | null>(null)

    useEffect(() => {
        const image = markerRef.current?.getElement()?.querySelector('img')
        if (image instanceof HTMLImageElement) {
            image.style.transform = `rotate(${heading}deg)`
        }
    }, [heading])

    return <Marker ref={markerRef} position={position as LatLngExpression} icon={CYCLONE_ICON} />
}

function collectHulls(event: TyphoonEvent): HullByIntensity {
    const hulls: HullByIntensity = new Map()
    if (event.hull) {
        hulls.set(60, event.hull)
    }
    for (const field of event.wind_fields ?? []) {
        if (!RELEVANT_WIND_FIELDS.includes(field.intensity)) continue
        if (!field.hull) continue
        hulls.set(field.intensity, field.hull)
    }
    return hulls
}

/** Leaflet order (`[lat, lon]`), or null when the track is missing. */
function toLeafletTrack(event: TyphoonEvent): [number, number][] | null {
    if (!Array.isArray(event.track) || event.track.length < 2) return null
    return event.track.map(([lon, lat]): [number, number] => [lat, lon])
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

/**
 * Draws and animates one selected typhoon. Nothing is rendered until MapView
 * has a selected event, so the map has no hazard overlay on its own.
 */
export function TyphoonMarkers({ event }: { event: TyphoonEvent | null }) {
    if (!event) return null

    // Remounting per event gives the animation fresh initial state without
    // resetting state from inside an effect.
    return <SelectedTyphoon key={event.eventid} event={event} />
}

function SelectedTyphoon({ event }: { event: TyphoonEvent }) {
    const hull = useMemo(() => collectHulls(event), [event])
    const track = useMemo(() => toLeafletTrack(event), [event])

    const [cyclone, setCyclone] = useState<CycloneState>(() => {
        if (!track) return { position: null, heading: null }
        return { position: track[0], heading: bearingDeg(track[0], track[1]) }
    })

    const animFrameRef = useRef<number | null>(null)
    /** Increments on every animation run so stale frames exit. */
    const runIdRef = useRef(0)

    useEffect(() => {
        if (!track) {
            console.warn(
                `[typhoon] ${event.eventid} has no track; the API response is probably stale. ` +
                'Restart the backend and hard-reload the page.',
            )
            return
        }

        const runId = ++runIdRef.current
        let startTime: number | null = null

        // eslint-disable-next-line no-console
        console.debug(`[typhoon] animating ${event.eventid} (${track.length} points)`)

        const animate = (now: number) => {
            // A newer selection has superseded this run; touch nothing else.
            if (runId !== runIdRef.current) return
            // Start the clock on the first frame: if rAF is delayed (hidden
            // tab, devtools, background window) the animation still plays
            // instead of jumping straight to its final position.
            if (startTime === null) startTime = now

            const progress = Math.min((now - startTime) / ANIMATION_DURATION_MS, 1)
            const index = progress * (track.length - 1)
            const segment = Math.floor(index)
            const fraction = index - segment

            if (segment >= track.length - 1) {
                const last = track[track.length - 1]
                setCyclone({
                    position: last,
                    heading: bearingDeg(track[track.length - 2], last),
                })
                // eslint-disable-next-line no-console
                console.debug(`[typhoon] animation finished for ${event.eventid}`)
                animFrameRef.current = null
                return
            }

            const from = track[segment]
            const to = track[segment + 1]
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

        return () => {
            runIdRef.current += 1
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current)
                animFrameRef.current = null
            }
        }
    }, [event.eventid, track])

    return (
        <>
            {Array.from(hull.entries()).map(([intensity, points]) => (
                <Polyline
                    key={`ty-${intensity}`}
                    positions={points.map(([lon, lat]): [number, number] => [lat, lon])}
                    pathOptions={{ color: 'green', weight: 2 }}
                />
            ))}
            {track && (
                <Polyline
                    positions={track}
                    pathOptions={{ color: 'blue', weight: 2, dashArray: '8, 8' }}
                />
            )}
            {cyclone.position && cyclone.heading !== null && (
                <CycloneMarker position={cyclone.position} heading={cyclone.heading} />
            )}
        </>
    )
}
