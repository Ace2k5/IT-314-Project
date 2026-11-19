/**
 * Evacuation-centre markers live here.
 *
 * The data is already available: `getEvacuationCenters()` in
 * `cache/evacCenterCache.ts` returns every row ingested from
 * `externals/ph_evacs_cleaned.geojson`, and `utils/shelterIcons.ts` builds the
 * pin for a shelter's type.
 *
 * TODO(shelters): render one `<Marker>` per centre with
 * `createShelterIcon(center.name, center.type)`, and drive the open `<Popup>`
 * from `useShelterStore`'s `selectedId`.
 */
export function ShelterMarkers() {
    return null
}
