import {
    BASEMAP_OPTIONS,
    FONT_OPTIONS,
    MAX_ICON_POP_SPEED,
    MIN_ICON_POP_SPEED,
    useAppearanceStore,
} from '../../stores/useAppearanceStore'
import { WEATHER_ICONS } from '../weather/weatherIcons'
import darkModeIcon from './settings_assets/dark_mode_icon.png'
import type { SettingsSection } from './sections'
import './AppearanceSection.css'

type SectionButtonProps = {
    activeSection: SettingsSection
    setActiveSection: (section: SettingsSection) => void
}

export function AppearanceSectionButton({ activeSection, setActiveSection }: SectionButtonProps) {
    return (
        <button
            type="button"
            className={`btn-sidebar${activeSection === 'appearance' ? ' active' : ''}`}
            onClick={() => setActiveSection('appearance')}
        >
            <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
            >
                <circle cx="12" cy="12" r="3.5" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
            </svg>
            <span>Appearance</span>
        </button>
    )
}

export function AppearanceSection() {
    const iconPopupSpeed = useAppearanceStore((state) => state.iconPopupSpeed)
    const setIconPopupSpeed = useAppearanceStore((state) => state.setIconPopupSpeed)
    const fontFamily = useAppearanceStore((state) => state.fontFamily)
    const setFontFamily = useAppearanceStore((state) => state.setFontFamily)
    const basemap = useAppearanceStore((state) => state.basemap)
    const setBasemap = useAppearanceStore((state) => state.setBasemap)
    const darkMode = useAppearanceStore((state) => state.darkMode)
    const setDarkMode = useAppearanceStore((state) => state.setDarkMode)

    return (
        <div className="appearance-section">
            <h2>Appearance</h2>
            <p className="section-description">
                Choose your theme, typeface, and base map, and tune how hazard icons appear.
            </p>

            <div className="appearance-group">
                <h3 className="appearance-group-title">Theme</h3>
                <div className="appearance-theme-toggle">
                    <img className="appearance-theme-icon" src={darkModeIcon} alt="" />
                    <span className="appearance-theme-label">
                        <strong>Dark mode</strong>
                        <small>{darkMode ? 'On' : 'Off'}</small>
                    </span>
                    <button
                        type="button"
                        role="switch"
                        aria-label="Dark mode"
                        aria-checked={darkMode}
                        className={`appearance-switch${darkMode ? ' active' : ''}`}
                        onClick={() => setDarkMode(!darkMode)}
                    >
                        <span />
                    </button>
                </div>
            </div>

            <div className="appearance-group">
                <h3 className="appearance-group-title">Font</h3>
                <div className="appearance-options" role="radiogroup" aria-label="Font">
                    {FONT_OPTIONS.map((font) => (
                        <button
                            key={font.key}
                            type="button"
                            role="radio"
                            aria-checked={fontFamily === font.key}
                            className={`appearance-option${fontFamily === font.key ? ' active' : ''}`}
                            style={{ fontFamily: font.stack }}
                            onClick={() => setFontFamily(font.key)}
                        >
                            <span>{font.label}</span>
                            {font.key === 'inter' ? (
                                <span className="appearance-badge">Recommended</span>
                            ) : null}
                        </button>
                    ))}
                </div>
            </div>

            <div className="appearance-group">
                <h3 className="appearance-group-title">Map</h3>
                <div className="appearance-options" role="radiogroup" aria-label="Map">
                    {BASEMAP_OPTIONS.map((option) => (
                        <button
                            key={option.key}
                            type="button"
                            role="radio"
                            aria-checked={basemap === option.key}
                            className={`appearance-option${basemap === option.key ? ' active' : ''}`}
                            onClick={() => setBasemap(option.key)}
                        >
                            <span>{option.label}</span>
                        </button>
                    ))}
                </div>
                <p className="appearance-note">
                    Base map drawn beneath the hazards, shelters, and weather.
                </p>
            </div>

            <div className="appearance-group">
                <h3 className="appearance-group-title">Motion</h3>
                <div className="appearance-preview">
                    <img
                        key={iconPopupSpeed}
                        className="appearance-preview-icon"
                        src={WEATHER_ICONS.sunny}
                        alt=""
                    />
                    <span>Preview · {iconPopupSpeed.toFixed(2)} s</span>
                </div>

                <label className="appearance-control">
                    <span>
                        Icon Popup Speed <strong>{iconPopupSpeed.toFixed(2)} s</strong>
                    </span>
                    <input
                        className="appearance-range"
                        type="range"
                        min={MIN_ICON_POP_SPEED}
                        max={MAX_ICON_POP_SPEED}
                        step={0.05}
                        value={iconPopupSpeed}
                        onChange={(event) => setIconPopupSpeed(Number(event.target.value))}
                    />
                </label>

                <p className="appearance-note">
                    Applies to the weather, shelter, and location markers, plus the map dock
                    icons.
                </p>
            </div>
        </div>
    )
}
