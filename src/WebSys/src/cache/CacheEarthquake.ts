import { BackendConnection } from "../api/receiveAPI";
import { Earthquake } from "../components/leaflet/EarthquakeDebug";

type Intensity = {
    "intensity": number,
    "width":  number,
    "height": number,
    "bbox": number,
    "hull": number,
}

type Event = {
    eventid: string,
    description: string,
    severity: number,
    severitytext: string,
    alertlevel: string,
    initialdate: string,
    enddate: string,
    intensities: Intensity[];
};

type EarthquakeMap = Map<number, Event>

export type Dates = {
    year: string,
    month: string,
    day: string
}

let earthquakeCache: EarthquakeMap = new Map();
const backend = BackendConnection()
const THRESHOLD: number = 180.00 * 1000
let old_time: number = Date.now()

async function updateCache({year, month, day}: Dates): Promise<void> {
    const response = await backend.GetEarthquake({year, month, day});
    const events = await response.json();

    if (!Array.isArray(events) || events.length === 0) {
        backend.Log(`[Frontend Earthquake Cache] No data for ${year}-${month}-${day}.`);
        return;
    }

    for (const event of events) {
        earthquakeCache.set(event.eventid, event);
    }
}

export async function GetEarthquakeData({year, month, day}: Dates): Promise<EarthquakeMap | undefined>{
    const new_time: number = Date.now()
    if ((new_time - old_time) > THRESHOLD) {
        updateCache({year, month, day})
        old_time = new_time
        return earthquakeCache
    }
}