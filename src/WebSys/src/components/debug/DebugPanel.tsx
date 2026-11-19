import { useState } from 'react'

import { backend } from '../../api/backendClient'
import { getEvacuationCenters } from '../../cache/evacCenterCache'
import { useUiStore } from '../../stores/useUiStore'
import type { EvacuationCenters } from '../../types/api'

export function DebugToggleButton() {
    const activePanel = useUiStore((state) => state.activePanel)
    const togglePanel = useUiStore((state) => state.togglePanel)
    const isOpen = activePanel === 'debug'

    const toggle = () => {
        void backend.log(isOpen ? 'Closing the debug panel.' : 'Opening the debug panel.')
        togglePanel('debug')
    }

    return (
        <button type="button" onClick={toggle}>
            {isOpen ? 'Close Debug Panel' : 'Show Debug Panel'}
        </button>
    )
}

export function Debug() {
    const [logs, setLogs] = useState('')
    const [centers, setCenters] = useState<EvacuationCenters | null>(null)

    const loadLogs = async () => {
        const response = await backend.log('The debug panel asked for the log.')
        setLogs(response ? response.logs : 'The backend did not return a log.')
    }

    const loadCenters = async () => {
        setCenters((await getEvacuationCenters()) ?? {})
    }

    const centerCount = centers ? Object.keys(centers).length : 0

    return (
        <div className="debug-component">
            <div className="status">
                <button type="button" onClick={loadLogs}>
                    Call Backend
                </button>
                {logs ? <pre>{logs}</pre> : null}
            </div>

            <div className="evac-centers">
                <button type="button" onClick={loadCenters}>
                    Check Evac Centers
                </button>
                {centers ? (
                    <p>
                        {centerCount} evacuation centre(s) loaded
                        {centerCount > 0 ? `, first: ${Object.values(centers)[0]?.name ?? ''}` : '.'}
                    </p>
                ) : null}
            </div>
        </div>
    )
}
