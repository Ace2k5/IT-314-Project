import { useState } from 'react'

import { backend } from '../../api/backendClient'
import { getEvacuationCenters } from '../../cache/evacCenterCache'
import type { EvacuationCenters } from '../../types/api'
import './Debug.css'

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
            <header className="debug-header">
                <h1>Debug Panel</h1>
                <p>Inspect the backend connection and the loaded evacuation centres.</p>
            </header>

            <div className="debug-grid">
                <section className="debug-card">
                    <h2>Backend log</h2>
                    <button type="button" className="debug-btn" onClick={loadLogs}>
                        Call Backend
                    </button>
                    {logs ? (
                        <pre>{logs}</pre>
                    ) : (
                        <p className="debug-hint">No log loaded yet.</p>
                    )}
                </section>

                <section className="debug-card">
                    <h2>Evacuation centres</h2>
                    <button type="button" className="debug-btn" onClick={loadCenters}>
                        Check Evac Centers
                    </button>
                    {centers ? (
                        <p className="debug-result">
                            {centerCount} evacuation centre(s) loaded
                            {centerCount > 0
                                ? `, first: ${Object.values(centers)[0]?.name ?? ''}`
                                : '.'}
                        </p>
                    ) : (
                        <p className="debug-hint">No centres loaded yet.</p>
                    )}
                </section>
            </div>
        </div>
    )
}
