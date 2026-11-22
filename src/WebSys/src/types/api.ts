/**
 * Shapes exchanged with the backend.
 *
 * TypeScript keeps the names the browser wants (camelCase). The two snake_case
 * fields the backend produces — `temperature_unit` and `weather_icon` — are
 * converted once, in `api/backendClient.ts`, so nothing else has to care.
 */

export type WeatherKind = 'sunny' | 'stormy' | 'rainy' | 'cloudy' | 'snowy'

export type WeatherEntry = {
    latitude: number
    longitude: number
    temperature: number
    temperatureUnit: string
    weather: string
    weatherIcon: WeatherKind
}

/** City name -> current weather. */
export type WeatherMap = Record<string, WeatherEntry>

/** `[west, south, east, north]`, straight from GDACS. */
export type BBox = [number, number, number, number]

/** `[longitude, latitude]` pairs, as GDACS and GeoJSON order them. */
export type Hull = [number, number][]

export type Intensity = {
    intensity: number
    radius_km: number | null
    width: number
    height: number
    bbox: BBox
    hull: Hull | null
}

export type EarthquakeEvent = {
    eventid: number
    description: string
    severity: number
    severitytext: string
    alertlevel: string
    initialdate: string
    enddate: string
    intensities: Intensity[]
}

/** The three values of the `<input type="date">` that scopes a query. */
export type Dates = {
    year: string
    month: string
    day: string
}

export type EvacuationCenter = {
    name: string
    lat: number
    lon: number
    type: "Barangay Hall" | "Campus" | "Church" | "Sports Center"
    address: string | null
}

/** Shelter id (as a string, because it arrives as a JSON object key) -> shelter. */
export type EvacuationCenters = Record<string, EvacuationCenter>

export type ModelInfo = {
    id: string
    owned_by?: string
}

export type LogResponse = {
    logs: string
}

export type ChatRole = 'user' | 'assistant' | 'system' | 'tool'

export type ChatMessage = {
    role: ChatRole
    content: string
}

export type NewsItem = {
    title: string
    url: string
    summary: string
    provider: string
}

/** `[longitude, latitude]` pair. */
export type Coordinate = [number, number]

export type TyphoonEvent = {
    eventid: number
    description: string
    severity: number | null
    severitytext: string | null
    alertlevel: string | null
    initialdate: string | null
    enddate: string | null
    center: Coordinate | null
    position: Coordinate | null
    radius_km: number | null
    bbox: BBox | null
    hull: Hull | null
    timestamp: string | null
    wind_fields: Intensity[]
    /** Track positions as `[longitude, latitude]`, oldest first. */
    track: Coordinate[]
    /** Advisory labels parallel to `track`; same length. */
    track_times: string[] | null
    /** Compass bearing of the final segment, 0 = north, clockwise. */
    heading_deg: number | null
}
