import { useEffect, useMemo } from 'react'

import { useAlertStore } from '../../stores/useAlertStore'
import { useHazardStore } from '../../stores/useHazardStore'
import { useRouteStore } from '../../stores/useRouteStore'
import { useShelterDataStore } from '../../stores/useShelterDataStore'
import { formatDistanceKm, toShelterEntries } from '../leaflet/shelterUtils'
import cycloneIcon from '../leaflet/map_assets/cyclone.png'
import earthquakeIcon from '../leaflet/map_assets/earthquake.png'
import './AlertView.css'

/** High-alert banner and the nearest-shelter call to action. */
export function AlertView() {
    const alert = useAlertStore((state) => state.alert)
    const centers = useShelterDataStore((state) => state.centers)
    const loadShelters = useShelterDataStore((state) => state.loadShelters)

    useEffect(() => {
        if (alert) void loadShelters()
    }, [alert, loadShelters])

    // Pulse the page background, not an overlay above the map and cards.
    useEffect(() => {
        if (!alert) return
        document.body.classList.add('alert-active')
        return () => document.body.classList.remove('alert-active')
    }, [alert])

    const nearest = useMemo(() => {
        if (!alert) return null
        return toShelterEntries(centers ?? {}, alert.origin)[0] ?? null
    }, [alert, centers])

    if (!alert) return null

    const label = alert.kind === 'earthquake' ? 'SIMULATED EARTHQUAKE' : 'SIMULATED TYPHOON'
    const icon = alert.kind === 'earthquake' ? earthquakeIcon : cycloneIcon

    const routeToNearest = () => {
        if (!nearest) return
        useRouteStore.getState().setTarget({
            id: `shelter:${nearest.id}`,
            latitude: nearest.center.lat,
            longitude: nearest.center.lon,
        })
    }

    const endSimulation = () => {
        useAlertStore.getState().stop()
        useHazardStore.getState().clearEarthquake()
        useHazardStore.getState().clearTyphoon()
        useRouteStore.getState().clearTarget()
    }

    return (
        <section className="alert-banner" role="alert" aria-live="assertive">
            <img className="alert-banner-icon" src={icon} alt="" />
            <div className="alert-banner-body">
                <p className="alert-banner-eyebrow">{label}</p>
                <h2>Nearest evacuation center</h2>
                {nearest ? (
                    <>
                        <p className="alert-banner-shelter">{nearest.center.name}</p>
                        <p className="alert-banner-meta">
                            {nearest.center.type} · {formatDistanceKm(nearest.distanceKm)} away
                        </p>
                    </>
                ) : (
                    <p className="alert-banner-meta">Finding the nearest shelter…</p>
                )}
            </div>
            <div className="alert-banner-actions">
                <button
                    type="button"
                    className="alert-primary"
                    onClick={routeToNearest}
                    disabled={!nearest}
                >
                    Route to shelter
                </button>
                <button type="button" className="alert-secondary" onClick={endSimulation}>
                    End simulation
                </button>
            </div>
        </section>
    )
}
