import { BackendConnection } from "../api/receiveAPI"

export interface EvacuationCenter {
    id: number,
    name: string,
    lat: number,
    lon: number,
    type: string,
    address: string
}
const THRESHOLD: number = 180.00 * 1000
const backend = BackendConnection()
let evac_promise: boolean | Promise<void> = false
let evacCache: null | EvacuationCenter = null


async function getEvacCenter() {
    const evacCenters = await backend.EvacCenter()
    evacCache = evacCenters
}

function ensureEvacCache() {
    if (evac_promise === false){
        evac_promise = getEvacCenter().finally(() => {evac_promise = false})
    }
    return evac_promise
}

export async function CacheEvacCenter() {
    await ensureEvacCache()
    return evacCache
}