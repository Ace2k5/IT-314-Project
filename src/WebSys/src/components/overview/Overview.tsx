import { useEffect, useMemo, useState } from 'react'

import { getEvacuationCenters } from '../../cache/evacCenterCache'
import { getOverviewWeather } from '../../cache/overviewWeather'
import type { OverviewWeather } from '../../cache/overviewWeather'
import { useLocationStore } from '../../stores/useLocationStore'
import { useMapDockStore } from '../../stores/useMapDockStore'
import { useShelterStore } from '../../stores/useShelterStore'
import { useUiStore } from '../../stores/useUiStore'
import type { EvacuationCenters, ForecastDay } from '../../types/api'
import { formatDistanceKm, toShelterEntries } from '../leaflet/shelterUtils'
import { formatAccuracy } from '../../utils/locationFormat'
import shelterIcon from '../leaflet/map_assets/shelter.png'
import { DisasterNews } from '../news/DisasterNews'
import { WEATHER_ICONS, WEATHER_LABELS } from '../weather/weatherIcons'
import './Overview.css'

export function OverviewToggleButton() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const isOpen = activePanel === 'overview'

    return (
        <button
            type="button"
            className={`nav-button${isOpen ? ' active' : ''}`}
            onClick={() => togglePanel('overview')}
        >
            Overview
        </button>
    )
}

function forecastLabel(day: ForecastDay, index: number): string {
    if (index === 0) return 'Today'
    if (index === 1) return 'Tomorrow'

    const parsed = new Date(`${day.date}T12:00:00`)
    if (Number.isNaN(parsed.getTime())) return day.date
    return parsed.toLocaleDateString(undefined, { weekday: 'short' })
}

function updatedLabel(fetchedAt: number): string {
    return new Date(fetchedAt).toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
    })
}

export function Overview() {
    const coords = useLocationStore((state) => state.coords)
    const locationStatus = useLocationStore((state) => state.status)
    const locationError = useLocationStore((state) => state.error)
    const openLocationPicker = useUiStore((state) => state.openLocationPicker)

    const [shelters, setShelters] = useState<EvacuationCenters | null>(null)
    const [sheltersReady, setSheltersReady] = useState(false)
    const [weather, setWeather] = useState<OverviewWeather | null>(null)
    const [weatherError, setWeatherError] = useState<string | null>(null)
    const [reloadToken, setReloadToken] = useState(0)

    useEffect(() => {
        if (!coords) return

        let cancelled = false
        void getOverviewWeather(coords.latitude, coords.longitude).then((data) => {
            if (cancelled) return

            if (data) {
                setWeather(data)
                setWeatherError(null)
            } else {
                setWeatherError('The forecast could not be loaded.')
            }
        })

        return () => {
            cancelled = true
        }
    }, [coords, reloadToken])

    // The weather session TTL is three minutes; checking every minute lets the
    // observed min/max update while Overview stays open.
    useEffect(() => {
        const timer = window.setInterval(() => {
            setReloadToken((token) => token + 1)
        }, 60_000)
        return () => window.clearInterval(timer)
    }, [])

    useEffect(() => {
        let cancelled = false

        void getEvacuationCenters().then((centers) => {
            if (cancelled) return
            setShelters(centers ?? {})
            setSheltersReady(true)
        })

        return () => {
            cancelled = true
        }
    }, [])

    const nearestShelter = useMemo(() => {
        if (!coords || !shelters) return null
        return toShelterEntries(shelters, coords)[0] ?? null
    }, [coords, shelters])

    const showShelterOnMap = () => {
        if (!nearestShelter) return

        // Show the direct nearest route; turn off a radius that would hide it.
        useShelterStore.getState().setRadiusMode(false)
        useShelterStore.getState().selectShelter(nearestShelter.id)
        useMapDockStore.getState().setPanel('shelter')
        useUiStore.getState().togglePanel('map')
    }

    const locationLine = coords
        ? `${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)} · ${
              coords.source === 'manual'
                  ? 'Pinned manually'
                  : `±${formatAccuracy(coords.accuracy)}`
          }`
        : locationStatus === 'locating'
          ? 'Finding your location…'
          : (locationError ?? 'Location access has not been granted yet.')

    return (
        <main className="overview-page">
            <section className="overview-hero">
                <p className="overview-eyebrow">Your local forecast</p>
                <h1>{weather?.place ? `Near ${weather.place}` : 'Your location'}</h1>
                <p className="overview-coords">{locationLine}</p>
                {coords ? (
                    <button
                        type="button"
                        className="overview-location-change"
                        onClick={openLocationPicker}
                    >
                        Change location
                    </button>
                ) : null}

                {!coords ? (
                    <div className="overview-status">
                        <p>
                            {locationStatus === 'locating'
                                ? 'Waiting for the browser to share your position…'
                                : 'Allow location access to see the temperature and forecast where you are.'}
                        </p>
                        <button
                            type="button"
                            className="overview-action"
                            onClick={openLocationPicker}
                            disabled={locationStatus === 'locating'}
                        >
                            {locationStatus === 'locating' ? 'Locating…' : 'Find location'}
                        </button>
                    </div>
                ) : weatherError && !weather ? (
                    <div className="overview-status">
                        <p>
                            The forecast could not be loaded. Check that the backend is running
                            on port 9999.
                        </p>
                        <button
                            type="button"
                            className="overview-action"
                            onClick={() => setReloadToken((token) => token + 1)}
                        >
                            Retry
                        </button>
                    </div>
                ) : !weather ? (
                    <p className="overview-loading">Loading your local forecast…</p>
                ) : (
                    <>
                        <div className="overview-now">
                            <img
                                className="overview-now-icon"
                                src={WEATHER_ICONS[weather.current.weatherIcon]}
                                alt=""
                            />
                            <div className="overview-now-temp">
                                {Math.round(weather.current.temperature)}
                                <span>{weather.current.temperatureUnit}</span>
                            </div>
                            <div className="overview-now-meta">
                                <strong>{WEATHER_LABELS[weather.current.weatherIcon]}</strong>
                                <span>
                                    Observed low {Math.round(weather.min)}° · high{' '}
                                    {Math.round(weather.max)}°
                                </span>
                                <span className="overview-updated">
                                    Updated {updatedLabel(weather.fetchedAt)}
                                </span>
                            </div>
                        </div>

                        <ol className="overview-forecast">
                            {weather.daily.slice(0, 5).map((day, index) => (
                                <li className="forecast-day" key={day.date}>
                                    <span className="forecast-day-label">
                                        {forecastLabel(day, index)}
                                    </span>
                                    <img src={WEATHER_ICONS[day.weatherIcon]} alt="" />
                                    <span className="forecast-temps">
                                        <strong>{Math.round(day.temperatureMax)}°</strong>
                                        <span>{Math.round(day.temperatureMin)}°</span>
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </>
                )}
            </section>

            <section className="overview-shelter" aria-labelledby="closest-shelter-heading">
                <div className="overview-shelter-icon">
                    <img src={shelterIcon} alt="" />
                </div>
                <div className="overview-shelter-body">
                    <p className="overview-eyebrow">Nearest to you</p>
                    <h2 id="closest-shelter-heading">Closest shelter</h2>

                    {!coords ? (
                        <p className="overview-shelter-note">
                            Allow location access to find the nearest evacuation centre.
                        </p>
                    ) : !sheltersReady ? (
                        <p className="overview-shelter-note">Loading shelters…</p>
                    ) : nearestShelter ? (
                        <>
                            <p className="overview-shelter-name">
                                {nearestShelter.center.name}
                            </p>
                            <p className="overview-shelter-meta">
                                {nearestShelter.center.type} ·{' '}
                                {formatDistanceKm(nearestShelter.distanceKm)} away
                            </p>
                            {nearestShelter.center.address ? (
                                <p className="overview-shelter-address">
                                    {nearestShelter.center.address}
                                </p>
                            ) : null}
                        </>
                    ) : (
                        <p className="overview-shelter-note">
                            No shelters are available right now.
                        </p>
                    )}
                </div>

                {nearestShelter ? (
                    <button
                        type="button"
                        className="overview-shelter-action"
                        onClick={showShelterOnMap}
                    >
                        Show on map
                    </button>
                ) : null}
            </section>

            <section className="disaster-news overview-news" aria-labelledby="overview-news-heading">
                <h2 id="overview-news-heading" className="news-heading">
                    Latest Disaster News
                </h2>
                <DisasterNews />
            </section>
        </main>
    )
}
