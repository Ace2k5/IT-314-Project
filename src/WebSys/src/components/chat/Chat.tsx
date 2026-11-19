import { useState } from 'react'

import { sendChatMessage } from '../../services/chatStream'
import { useChatStore } from '../../stores/useChatStore'
import { NewsList } from '../news/News'
import './Chat.css'

export function Chat() {
    const draft = useChatStore((state) => state.draft)
    const history = useChatStore((state) => state.history)
    const streamingText = useChatStore((state) => state.streamingText)
    const isLoading = useChatStore((state) => state.isLoading)
    const error = useChatStore((state) => state.error)
    const setDraft = useChatStore((state) => state.setDraft)

    const [sessionId] = useState(() => crypto.randomUUID())

    const submit = () => {
        void sendChatMessage(draft, sessionId, { clearDraft: true })
    }

    return (
        <>
            <div className="chat-box">
                <div className="display-messages">
                    <div className="user-message">
                        {history.map((message, index) => (
                            <div key={`${message.role}-${index}`}>
                                {message.role}: {message.content}
                            </div>
                        ))}
                    </div>
                    <div className="assistant-message">
                        {streamingText ? <div>assistant: {streamingText} (typing...)</div> : null}
                    </div>
                    {error ? <p className="chat-error">{error}</p> : null}
                </div>

                <div className="input-field">
                    <input
                        type="text"
                        value={draft}
                        disabled={isLoading}
                        placeholder="Ask about disasters, weather or evacuation centres"
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') submit()
                        }}
                    />
                    <button type="button" onClick={submit} disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send'}
                    </button>
                </div>
            </div>

            <div className="News">
                <NewsList />
            </div>
        </>
    )
}
