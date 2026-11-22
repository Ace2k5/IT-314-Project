import {
    MAX_ICON_POP_SPEED,
    MIN_ICON_POP_SPEED,
    useAppearanceStore,
} from '../../stores/useAppearanceStore'
import { WEATHER_ICONS } from '../weather/weatherIcons'
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

    return (
        <div className="appearance-section">
            <h2>Appearance</h2>
            <p className="section-description">
                Tune how map icons and hazard controls appear.
            </p>

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
                Applies to the weather, shelter, and location markers, plus the map dock icons.
            </p>
        </div>
    )
}
