import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

import type { EarthquakeEvent, TyphoonEvent } from '../../types/api'
import type { MapPanel } from '../../stores/useMapDockStore'
import { eventBadge, formatEventDate } from './hazardFormat'
import { HazardShowcase } from './HazardShowcase'
import { ShelterPanel } from './ShelterPanel'
import type { ShelterEntry } from './shelterUtils'
import cycloneIcon from './map_assets/cyclone.png'
import earthquakeIcon from './map_assets/earthquake.png'
import shelterIcon from './map_assets/shelter.png'

type PickableEvent = {
    eventid: number
    description: string
    initialdate?: string | null
    severitytext?: string | null
    alertlevel?: string | null
}

type MapDockProps = {
    earthquakeEvents: EarthquakeEvent[]
    typhoonEvents: TyphoonEvent[]
    earthquakeReady: boolean
    typhoonReady: boolean
    selectedEarthquake: EarthquakeEvent | null
    selectedTyphoon: TyphoonEvent | null
    selectedShelterId: string | null
    shelters: ShelterEntry[]
    sheltersReady: boolean
    openPanel: MapPanel | null
    onTogglePanel: (panel: MapPanel) => void
    onClosePanel: () => void
    onSelectEarthquake: (event: EarthquakeEvent) => void
    onSelectTyphoon: (event: TyphoonEvent) => void
    onClearEarthquake: () => void
    onClearTyphoon: () => void
    onRequestLocation: () => void
}

type DragState = {
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
    rect: DOMRect
}

const VIEWPORT_MARGIN = 8

/** Newest events first; a missing date sorts last. */
function sortNewest<T extends { initialdate?: string | null }>(events: T[]): T[] {
    return [...events].sort((a, b) => (b.initialdate ?? '').localeCompare(a.initialdate ?? ''))
}

function EventOptions<T extends PickableEvent>({
    events,
    ready,
    selectedId,
    onSelect,
    emptyLabel,
}: {
    events: T[]
    ready: boolean
    selectedId: number | null
    onSelect: (event: T) => void
    emptyLabel: string
}) {
    if (!ready) {
        return <p className="hazard-window-note">Loading {emptyLabel}…</p>
    }
    if (events.length === 0) {
        return <p className="hazard-window-note">No {emptyLabel} found.</p>
    }

    return (
        <ul className="hazard-option-list">
            {events.map((event) => {
                const badge = eventBadge(event.severitytext, event.alertlevel)
                return (
                    <li key={event.eventid}>
                        <button
                            type="button"
                            className={event.eventid === selectedId ? 'selected' : ''}
                            onClick={() => onSelect(event)}
                        >
                            <span className="hazard-option-date">
                                {formatEventDate(event.initialdate)}
                            </span>
                            <span className="hazard-option-title">{event.description}</span>
                            {badge ? <span className="hazard-option-badge">{badge}</span> : null}
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

/**
 * The floating dock at the bottom of the map. Earthquakes, Typhoons, and
 * Shelters share one draggable window above it.
 */
export function MapDock({
    earthquakeEvents,
    typhoonEvents,
    earthquakeReady,
    typhoonReady,
    selectedEarthquake,
    selectedTyphoon,
    selectedShelterId,
    shelters,
    sheltersReady,
    openPanel,
    onTogglePanel,
    onClosePanel,
    onSelectEarthquake,
    onSelectTyphoon,
    onClearEarthquake,
    onClearTyphoon,
    onRequestLocation,
}: MapDockProps) {
    const windowRef = useRef<HTMLDivElement | null>(null)
    const dragRef = useRef<DragState | null>(null)
    const [showList, setShowList] = useState(false)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [dragging, setDragging] = useState(false)

    const handleDragStart = (event: ReactPointerEvent<HTMLElement>) => {
        // The close button lives in the header; clicks on it must not drag.
        if ((event.target as HTMLElement).closest('button')) return

        const rect = windowRef.current?.getBoundingClientRect()
        if (!rect) return

        event.preventDefault()
        dragRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            originX: offset.x,
            originY: offset.y,
            rect,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragging(true)
    }

    const handleDragMove = (event: ReactPointerEvent<HTMLElement>) => {
        const drag = dragRef.current
        if (!drag || drag.pointerId !== event.pointerId) return

        const dx = event.clientX - drag.startX
        const dy = event.clientY - drag.startY
        const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - drag.rect.width - VIEWPORT_MARGIN)
        const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - drag.rect.height - VIEWPORT_MARGIN)
        const left = Math.min(Math.max(drag.rect.left + dx, VIEWPORT_MARGIN), maxLeft)
        const top = Math.min(Math.max(drag.rect.top + dy, VIEWPORT_MARGIN), maxTop)

        setOffset({
            x: drag.originX + (left - drag.rect.left),
            y: drag.originY + (top - drag.rect.top),
        })
    }

    const handleDragEnd = (event: ReactPointerEvent<HTMLElement>) => {
        if (!dragRef.current) return
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
        }
        dragRef.current = null
        setDragging(false)
    }

    const earthquakes = sortNewest(earthquakeEvents)
    const typhoons = sortNewest(typhoonEvents)

    const openFor = (panel: MapPanel) => {
        // Clicking the active dock button closes its window.
        if (openPanel === panel) {
            onClosePanel()
            return
        }

        // Opening from closed returns the window to its default spot; switching
        // between panels keeps wherever the user dragged it.
        if (openPanel === null) setOffset({ x: 0, y: 0 })
        if (panel === 'earthquake') setShowList(selectedEarthquake === null)
        if (panel === 'typhoon') setShowList(selectedTyphoon === null)
        onTogglePanel(panel)
    }

    const isEarthquake = openPanel === 'earthquake'
    const isTyphoon = openPanel === 'typhoon'
    const isShelter = openPanel === 'shelter'
    const showDetails =
        !showList &&
        ((isEarthquake && selectedEarthquake !== null) ||
            (isTyphoon && selectedTyphoon !== null))

    const headerIcon = isEarthquake
        ? earthquakeIcon
        : isTyphoon
          ? cycloneIcon
          : shelterIcon
    const headerTitle = isEarthquake ? 'Earthquakes' : isTyphoon ? 'Typhoons' : 'Shelters'

    return (
        <div className="hazard-dock">
            <button
                type="button"
                className={`hazard-button${selectedEarthquake ? ' has-selection' : ''}${
                    isEarthquake ? ' active' : ''
                }`}
                aria-label="Earthquake events"
                aria-haspopup="dialog"
                aria-expanded={isEarthquake}
                onClick={() => openFor('earthquake')}
            >
                <img src={earthquakeIcon} alt="" draggable={false} />
                <span>Earthquakes</span>
            </button>
            <button
                type="button"
                className={`hazard-button${selectedTyphoon ? ' has-selection' : ''}${
                    isTyphoon ? ' active' : ''
                }`}
                aria-label="Typhoon events"
                aria-haspopup="dialog"
                aria-expanded={isTyphoon}
                onClick={() => openFor('typhoon')}
            >
                <img src={cycloneIcon} alt="" draggable={false} />
                <span>Typhoons</span>
            </button>
            <button
                type="button"
                className={`hazard-button${selectedShelterId ? ' has-selection' : ''}${
                    isShelter ? ' active' : ''
                }`}
                aria-label="Shelters"
                aria-haspopup="dialog"
                aria-expanded={isShelter}
                onClick={() => openFor('shelter')}
            >
                <img src={shelterIcon} alt="" draggable={false} />
                <span>Shelters</span>
            </button>

            {openPanel ? (
                <div
                    ref={windowRef}
                    className={`hazard-window${dragging ? ' dragging' : ''}`}
                    style={{ transform: `translate(calc(-50% + ${offset.x}px), ${offset.y}px)` }}
                    role="dialog"
                    aria-modal="false"
                    aria-label={headerTitle}
                >
                    <header
                        className="hazard-window-header"
                        title="Drag to move"
                        onPointerDown={handleDragStart}
                        onPointerMove={handleDragMove}
                        onPointerUp={handleDragEnd}
                        onPointerCancel={handleDragEnd}
                    >
                        <img src={headerIcon} alt="" draggable={false} />
                        <h3>{headerTitle}</h3>
                        <button
                            type="button"
                            className="hazard-window-close"
                            aria-label="Close event window"
                            onClick={onClosePanel}
                        >
                            ×
                        </button>
                    </header>

                    <div className="hazard-window-body">
                        {isEarthquake ? (
                            selectedEarthquake && showDetails ? (
                                <HazardShowcase
                                    hazard="earthquake"
                                    event={selectedEarthquake}
                                    onChange={() => setShowList(true)}
                                    onClear={onClearEarthquake}
                                />
                            ) : (
                                <EventOptions
                                    events={earthquakes}
                                    ready={earthquakeReady}
                                    selectedId={selectedEarthquake?.eventid ?? null}
                                    onSelect={(event) => {
                                        onSelectEarthquake(event)
                                        setShowList(false)
                                    }}
                                    emptyLabel="earthquake events"
                                />
                            )
                        ) : isTyphoon ? (
                            selectedTyphoon && showDetails ? (
                                <HazardShowcase
                                    hazard="typhoon"
                                    event={selectedTyphoon}
                                    onChange={() => setShowList(true)}
                                    onClear={onClearTyphoon}
                                />
                            ) : (
                                <EventOptions
                                    events={typhoons}
                                    ready={typhoonReady}
                                    selectedId={selectedTyphoon?.eventid ?? null}
                                    onSelect={(event) => {
                                        onSelectTyphoon(event)
                                        setShowList(false)
                                    }}
                                    emptyLabel="typhoon events"
                                />
                            )
                        ) : (
                            <ShelterPanel
                                shelters={shelters}
                                ready={sheltersReady}
                                onRequestLocation={onRequestLocation}
                            />
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}
