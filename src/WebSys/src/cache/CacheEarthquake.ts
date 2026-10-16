import { BackendConnection } from "../api/receiveAPI";

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
let old_time: number = 0

async function updateCache({year, month, day}: Dates): Promise<void> {
    backend.Log("[Frontend Earthquake Cache] 1. updateCache")
    const events = await backend.GetEarthquake({year, month, day});

    if (!Array.isArray(events) || events.length === 0) {
        backend.Log(`[Frontend Earthquake Cache] No data for ${year}-${month}-${day}.`);
        earthquakeCache.clear()
        return;
    }
    earthquakeCache.clear()
    for (const event of events) {
        earthquakeCache.set(event.eventid, event);
    }
}

export async function GetEarthquakeData({year, month, day}: Dates): Promise<Event[]>{
    const new_time: number = Date.now()
    if (earthquakeCache.size === 0 || (new_time - old_time) > THRESHOLD) {
        await updateCache({year, month, day})
        backend.Log("[Frontend Earthquake Cache] 2. GetEarthquakeData")
        old_time = new_time
    }
    return Array.from(earthquakeCache.values())
}