import { useState } from 'react'

import { useSettingsStore } from '../../stores/useSettingsStore'
import { useUiStore } from '../../stores/useUiStore'
import { ApiSection, ApiSectionButton } from './ApiSection'
import { AppearanceSection, AppearanceSectionButton } from './AppearanceSection'
import { DeveloperSection, DeveloperSectionButton } from './DeveloperSection'
import { LoginSection, LoginSectionButton } from './LoginSection'
import type { SettingsSection } from './sections'
import './Settings.css'

export function SettingsToggleButton() {
    const isSettingsOpen = useUiStore((state) => state.isSettingsOpen)
    const toggleSettings = useUiStore((state) => state.toggleSettings)

    return (
        <button
            type="button"
            className={`nav-button${isSettingsOpen ? ' active' : ''}`}
            onClick={toggleSettings}
        >
            {isSettingsOpen ? 'Close Settings' : 'Open Settings'}
        </button>
    )
}

export function Settings() {
    const closeSettings = useUiStore((state) => state.closeSettings)
    const [activeSection, setActiveSection] = useState<SettingsSection>('login')
    const username = useSettingsStore((state) => state.username)
    const isLoggedIn = Boolean(username)

    return (
        <div className="settings-background">
            <div
                className="settings"
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
            >
                <header className="settings-topbar">
                    <h2 id="settings-title">Settings</h2>
                    <button
                        type="button"
                        className="exit-btn"
                        onClick={closeSettings}
                        aria-label="Close settings"
                    >
                        ×
                    </button>
                </header>

                <div className="settings-body">
                    <nav className="sidebar" aria-label="Settings sections">
                        <LoginSectionButton
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                            isLoggedIn={isLoggedIn}
                            username={username}
                        />
                        <ApiSectionButton
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                        <AppearanceSectionButton
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                        <DeveloperSectionButton
                            activeSection={activeSection}
                            setActiveSection={setActiveSection}
                        />
                    </nav>

                    <div className="settings-content">
                        {activeSection === 'login' ? <LoginSection /> : null}
                        {activeSection === 'api' ? <ApiSection /> : null}
                        {activeSection === 'appearance' ? <AppearanceSection /> : null}
                        {activeSection === 'developer' ? <DeveloperSection /> : null}
                    </div>
                </div>
            </div>
        </div>
    )
}
