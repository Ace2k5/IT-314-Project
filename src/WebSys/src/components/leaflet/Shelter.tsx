import { useEffect, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { escapeHtml } from '../../utils/escapeHtml'
import barangayhall from './map_assets/barangayhall.png'
import campus from './map_assets/campus.png'
import church from './map_assets/church.png'
import sportscenter from './map_assets/sportscenter.png'

import { useShelterStore } from '../../stores/useShelterStore'
import { backend } from '../../api/backendClient'
import { DETAILED_ZOOM } from './WeatherLayer'
import type { EvacuationCenters } from '../../types/api'

const SHELTER_ICONS: Record<string, string> = {
    "Barangay Hall": barangayhall,
    "Campus": campus,
    "Church": church,
    "Sports Center": sportscenter,
}

function createShelterIcon(name: string, type: string) {
    const icon = SHELTER_ICONS[type] ?? SHELTER_ICONS["Campus"]
    return L.divIcon({
        className: 'shelter-marker',
        iconSize: [40, 40],
        html: `<div><img src="${icon}" height="40" alt="" /><div>${escapeHtml(name)}</div></div>`,
    })
}

const MIN_DISTANCE_KM = 3

function haversineDistance(
    lat1: number, lon1: number,
    lat2: number, lon2: number,
): number {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function filterSheltersByDistance(centers: EvacuationCenters,minDistanceKm: number): EvacuationCenters {
    const entries = Object.entries(centers)
    const kept: [string, EvacuationCenters[string]][] = []

    for (const [id, entry] of entries) {
        let tooClose = false
        for (const [keptId] of kept) {
            const keptEntry = centers[keptId]
            const dist = haversineDistance(
                entry.lat, entry.lon,
                keptEntry.lat, keptEntry.lon,
            )
            if (dist < minDistanceKm) {
                tooClose = true
                break
            }
        }
        if (!tooClose) {
            kept.push([id, entry])
        }
    }

    return Object.fromEntries(kept)
}

function ZoomListener({ onZoom }: { onZoom: (z: number) => void }) {
    const map = useMap()
    useMapEvents({ zoomend: () => onZoom(map.getZoom()) })
    useEffect(() => { onZoom(map.getZoom()) }, [map, onZoom])
    return null
}

export function ShelterMarkers() {
    const selectedId = useShelterStore((state) => state.selectedId)
    const selectShelter = useShelterStore((state) => state.selectShelter)
    const clearSelection = useShelterStore((state) => state.clearSelection)
    const [shelters, setShelters] = useState<EvacuationCenters | null>(null)
    const [zoom, setZoom] = useState(6)

    useEffect(() => {
        let cancelled = false
        void (async () => {
            const res = await backend.getEvacuationCenters()
            if (cancelled) return
            setShelters(res)
        })()
        return () => { cancelled = true }
    }, [])

    const visible = zoom >= DETAILED_ZOOM ? filterSheltersByDistance(shelters!, MIN_DISTANCE_KM) : null
    return (<>
        <ZoomListener onZoom={setZoom} />
        {visible && Object.entries(visible).map(([event_id, entry]) => (
            <Marker
                key={event_id}
                position={[entry.lat, entry.lon]}
                icon={createShelterIcon(entry.name, entry.type)}
            >
                <Popup>
                    {entry.name}
                </Popup>
            </Marker>
        ))}
    </>)
}
