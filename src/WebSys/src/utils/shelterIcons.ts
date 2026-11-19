import L from 'leaflet'
import { escapeHtml } from './escapeHtml'
import barangayhall from '../components/leaflet/map_assets/barangayhall.png'
import campus from '../components/leaflet/map_assets/campus.png'
import church from '../components/leaflet/map_assets/church.png'
import sportscenter from '../components/leaflet/map_assets/sportscenter.png'

/** Icon per shelter type. Anything unrecognised falls back to the campus pin. */
const SHELTER_ICONS: Record<string, string> = {
    barangayhall,
    campus,
    church,
    sportscenter,
}

export function createShelterIcon(name: string, type: string) {
    const icon = SHELTER_ICONS[type] ?? campus
    return L.divIcon({
        className: 'shelter-marker',
        iconSize: [40, 40],
        html: `<div><img src="${icon}" height="40" alt="" /><div>${escapeHtml(name)}</div></div>`,
    })
}
