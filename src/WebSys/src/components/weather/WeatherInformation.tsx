import { useState } from 'react'

import { getCityWeather } from '../../cache/weatherCache'
import type { WeatherEntry } from '../../types/api'

/**
 * Standalone weather readout. Not mounted in the app yet; the map layer covers
 * the same data. Kept because it is the quickest way to eyeball one raw reading.
 */
export function WeatherInformation() {
    const [entries, setEntries] = useState<[string, WeatherEntry][] | null>(null)
    const [status, setStatus] = useState('')

    const load = async () => {
        setStatus('Loading...')
        const weather = await getCityWeather()
        if (!weather) {
            setEntries(null)
            setStatus('Could not read the weather from the backend.')
            return
        }
        setEntries(Object.entries(weather))
        setStatus('')
    }

    return (
        <div className="weather-information">
            <button type="button" onClick={load}>
                Get weather information
            </button>

            {status ? <p>{status}</p> : null}

            {entries?.map(([city, entry]) => (
                <p key={city}>
                    {city}: {entry.temperature}
                    {entry.temperatureUnit} ({entry.weatherIcon})
                </p>
            ))}
        </div>
    )
}
