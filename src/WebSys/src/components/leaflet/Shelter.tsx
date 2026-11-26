import { useEffect, useMemo, useRef, useState } from 'react'
import { Marker, Popup, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

import { escapeHtml } from '../../utils/escapeHtml'
import { useRouteStore } from '../../stores/useRouteStore'
import { useShelterStore } from '../../stores/useShelterStore'
import barangayhall from './map_assets/barangayhall.png'
import campus from './map_assets/campus.png'
import church from './map_assets/church.png'
import sportscenter from './map_assets/sportscenter.png'
import { formatDistanceKm } from './shelterUtils'
import type { ShelterEntry } from './shelterUtils'

const SHELTER_ICONS: Record<string, string> = {
    'Barangay Hall': barangayhall,
    Campus: campus,
    Church: church,
    'Sports Center': sportscenter,
}

/** Names are only useful once the map is zoomed in; at country scale they overlap. */
const LABEL_ZOOM = 12

function createShelterIcon(name: string, type: string, selected: boolean, showLabel: boolean) {
    const icon = SHELTER_ICONS[type] ?? SHELTER_ICONS.Campus
    const label = showLabel
        ? `<span class="marker-chip-name">${escapeHtml(name)}</span>`
        : ''
    return L.divIcon({
        className: `shelter-marker${selected ? ' selected' : ''}`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
        popupAnchor: [0, -40],
        html: `<div class="marker-chip">
            <div class="marker-chip-body${showLabel ? '' : ' compact'}">
                <img class="marker-chip-icon" src="${icon}" alt="" />
                ${label}
            </div>
        </div>`,
    })
}

/**
 * Renders the filtered shelter set. The store's selection decides which popup
 * is open; selecting from the Shelters window flies here and opens it.
 */
export function ShelterMarkers({
    shelters,
    enabled,
}: {
    shelters: ShelterEntry[]
    enabled: boolean
}) {
    const map = useMap()
    const [zoom, setZoom] = useState(() => map.getZoom())
    const selectedId = useShelterStore((state) => state.selectedId)
    const selectShelter = useShelterStore((state) => state.selectShelter)
    const clearSelection = useShelterStore((state) => state.clearSelection)
    const setRouteTarget = useRouteStore((state) => state.setTarget)
    const clearRouteTarget = useRouteStore((state) => state.clearTarget)
    const markerRefs = useRef<Record<string, L.Marker | null>>({})

    useMapEvents({
        zoomend: (event) => setZoom(event.target.getZoom()),
    })

    const showLabel = zoom >= LABEL_ZOOM

    // Non-selected icons stay stable across selection changes, so only the
    // markers whose appearance actually changes get the pop animation.
    const baseIcons = useMemo(() => {
        const icons = new Map<string, L.DivIcon>()
        for (const { id, center } of shelters) {
            icons.set(id, createShelterIcon(center.name, center.type, false, showLabel))
        }
        return icons
    }, [shelters, showLabel])

    const selectedIcon = useMemo(() => {
        const current = shelters.find((shelter) => shelter.id === selectedId)
        return current
            ? createShelterIcon(current.center.name, current.center.type, true, showLabel)
            : null
    }, [shelters, selectedId, showLabel])

    useEffect(() => {
        if (!enabled || !selectedId) return

        const marker = markerRefs.current[selectedId]
        if (!marker) return

        const position = marker.getLatLng()
        if (!map.getBounds().contains(position)) {
            map.flyTo(position, Math.max(map.getZoom(), 13), { duration: 0.6 })
        }
        marker.openPopup()
    }, [enabled, selectedId, map])

    if (!enabled) return null

    return (
        <>
            {shelters.map(({ id, center, distanceKm }) => {
                const selected = id === selectedId
                return (
                    <Marker
                        key={id}
                        ref={(marker) => {
                            markerRefs.current[id] = marker
                        }}
                        position={[center.lat, center.lon]}
                        icon={selected ? (selectedIcon ?? baseIcons.get(id)) : baseIcons.get(id)}
                        zIndexOffset={selected ? 500 : 0}
                        eventHandlers={{
                            click: () => {
                                selectShelter(id)
                                setRouteTarget({
                                    id: `shelter:${id}`,
                                    latitude: center.lat,
                                    longitude: center.lon,
                                })
                            },
                            popupclose: () => {
                                if (useShelterStore.getState().selectedId === id) {
                                    clearSelection()
                                }
                                clearRouteTarget(`shelter:${id}`)
                            },
                        }}
                    >
                        <Popup>
                            <dl className="marker-detail-facts">
                                <dt>Name</dt>
                                <dd>{center.name}</dd>
                                <dt>Type</dt>
                                <dd>{center.type}</dd>
                                <dt>Location</dt>
                                <dd>
                                    {center.address ??
                                        `${center.lat.toFixed(5)}, ${center.lon.toFixed(5)}`}
                                </dd>
                                {distanceKm !== null ? (
                                    <>
                                        <dt>Distance</dt>
                                        <dd className="marker-detail-distance">
                                            {formatDistanceKm(distanceKm)} until destination
                                        </dd>
                                    </>
                                ) : null}
                            </dl>
                        </Popup>
                    </Marker>
                )
            })}
        </>
    )
}
