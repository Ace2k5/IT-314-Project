import { useEffect, useRef, useState } from 'react'

import { NEWS_QUERY, sendChatMessage } from '../../services/chatStream'
import { NewsList } from './News'

/**
 * Triggers the "latest disasters" search once when the map opens.
 *
 * The query is passed to `sendChatMessage` directly rather than written into the
 * chat draft, so opening the map no longer overwrites what the user is typing.
 */
export function DisasterNews() {
    const [sessionId] = useState(() => crypto.randomUUID())
    const hasRequested = useRef(false)

    useEffect(() => {
        if (hasRequested.current) return
        hasRequested.current = true
        void sendChatMessage(NEWS_QUERY, sessionId)
    }, [sessionId])

    return <NewsList />
}
