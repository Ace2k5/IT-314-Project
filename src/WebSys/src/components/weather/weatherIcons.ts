import type { WeatherKind } from '../../types/api'
import cloudyIcon from '../leaflet/map_assets/cloudy.png'
import rainyIcon from '../leaflet/map_assets/rainy.png'
import snowyIcon from '../leaflet/map_assets/snowy.png'
import stormyIcon from '../leaflet/map_assets/stormy.png'
import sunnyIcon from '../leaflet/map_assets/sunny.png'

/** The icon set shared by the map weather markers and the Overview forecast. */
export const WEATHER_ICONS: Record<WeatherKind, string> = {
    sunny: sunnyIcon,
    stormy: stormyIcon,
    rainy: rainyIcon,
    cloudy: cloudyIcon,
    snowy: snowyIcon,
}

export const WEATHER_LABELS: Record<WeatherKind, string> = {
    sunny: 'Clear skies',
    cloudy: 'Cloudy',
    rainy: 'Rain',
    snowy: 'Snow',
    stormy: 'Thunderstorm',
}
