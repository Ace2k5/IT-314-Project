import { useState } from 'react'

import { useUiStore } from '../../stores/useUiStore'
import { ApiSection, ApiSectionButton } from './ApiSection'
import type { SettingsSection } from './ApiSection'
import './Settings.css'

export function SettingsToggleButton() {
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)
    const toggleSettings = useUiStore((state) => state.toggleSettings)

    return (
        <button type="button" onClick={toggleSettings}>
            {isSettingsOpen ? 'Close Settings' : 'Open Settings'}
        </button>
    )
}

export function Settings() {
    const closeSettings = useUiStore((state) => state.closeSettings)
    const [activeSection, setActiveSection] = useState<SettingsSection>('api')

    return (
        <div className="settings-background">
            <div className="settings">
                <button
                    type="button"
                    className="exit-btn"
                    onClick={closeSettings}
                    aria-label="Close settings"
                >
                    X
                </button>

                <div className="sidebar">
                    <ApiSectionButton
                        activeSection={activeSection}
                        setActiveSection={setActiveSection}
                    />
                </div>

                <div className="settings-content">
                    {activeSection === 'api' ? <ApiSection /> : null}
                </div>
            </div>
        </div>
    )
}
