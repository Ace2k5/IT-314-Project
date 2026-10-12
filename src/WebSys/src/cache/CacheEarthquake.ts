import { BackendConnection } from "../api/receiveAPI";

type EarthquakeMap = Record<string, any>

let earthquakeCache: EarthquakeMap | null = null;
const backend = BackendConnection()
let init_promise: Promise<void> | null = null;

async function initCache() {
    backend.Log("[Frontend Earthquake Cache] Cache intilializing...")
    const response = await backend.InitEarthquake()
    if (!response) {
        backend.Log("[Frontend Earthquake Cache] Response for getting the initial Earthquake Data returned nothing.")
    }
}

function ensureInit() {
    backend.Log("[Frontend Earthquake Cache] Ensuring frontend cache is properly initialized...")
    if (!init_promise) init_promise = initCache()
    return init_promise
}