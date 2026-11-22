import { backend } from '../../api/backendClient'
import { useUiStore } from '../../stores/useUiStore'
import type { SettingsSection } from './sections'
import './DeveloperSection.css'

type SectionButtonProps = {
    activeSection: SettingsSection
    setActiveSection: (section: SettingsSection) => void
}

export function DeveloperSectionButton({ activeSection, setActiveSection }: SectionButtonProps) {
    return (
        <button
            type="button"
            className={`btn-sidebar${activeSection === 'developer' ? ' active' : ''}`}
            onClick={() => setActiveSection('developer')}
        >
            <svg
                className="btn-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <path d="m9 8-4 4 4 4M15 8l4 4-4 4" />
            </svg>
            <span>Developer</span>
        </button>
    )
}

export function DeveloperSection() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const closeSettings = useUiStore((state) => state.closeSettings)
    const isDebugOpen = activePanel === 'debug'

    const toggleDebugPanel = () => {
        void backend.log(isDebugOpen ? 'Closing the debug panel.' : 'Opening the debug panel.')
        togglePanel('debug')

        // The debug panel renders behind the settings overlay, so opening it
        // has to close Settings for the panel to be visible.
        if (!isDebugOpen) closeSettings()
    }

    return (
        <div className="developer-section">
            <h2>Developer</h2>
            <p className="section-description">
                The debug panel checks the backend connection and shows the loaded evacuation
                centres.
            </p>
            <button type="button" className="developer-btn" onClick={toggleDebugPanel}>
                {isDebugOpen ? 'Hide Debug Panel' : 'Show Debug Panel'}
            </button>
        </div>
    )
}
