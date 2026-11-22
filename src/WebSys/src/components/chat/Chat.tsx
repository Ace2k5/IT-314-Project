import { useState } from 'react'

import { sendChatMessage } from '../../services/chatStream'
import { useChatStore } from '../../stores/useChatStore'
import { useNewsStore } from '../../stores/useNewsStore'
import { NewsList } from '../news/News'
import cycloneIcon from '../leaflet/map_assets/cyclone.png'
import './Chat.css'

const SUGGESTIONS = [
    'What are the latest typhoons near the Philippines?',
    'Where are the nearest evacuation centres?',
    'Summarize recent earthquake activity.',
]

export function Chat() {
    const draft = useChatStore((state) => state.draft)
    const history = useChatStore((state) => state.history)
    const streamingText = useChatStore((state) => state.streamingText)
    const isLoading = useChatStore((state) => state.isLoading)
    const error = useChatStore((state) => state.error)
    const setDraft = useChatStore((state) => state.setDraft)
    const newsItems = useNewsStore((state) => state.items)

    const [sessionId] = useState(() => crypto.randomUUID())

    const submit = () => {
        void sendChatMessage(draft, sessionId, { clearDraft: true })
    }

    const ask = (prompt: string) => {
        void sendChatMessage(prompt, sessionId)
    }

    const hasConversation = history.length > 0 || Boolean(streamingText)

    return (
        <div className="chat-page">
            <section className="chat-box" aria-label="Disaster assistant">
                <header className="chat-header">
                    <div>
                        <h1>Disaster Assistant</h1>
                        <p>Ask about hazards, weather, or evacuation centres.</p>
                    </div>
                </header>

                <div className="display-messages">
                    {!hasConversation && !isLoading ? (
                        <div className="chat-empty">
                            <span className="chat-empty-icon">
                                <img src={cycloneIcon} alt="" />
                            </span>
                            <h2>How can I help?</h2>
                            <p>
                                I can look up current disaster news, weather, and nearby
                                evacuation centres.
                            </p>
                            <div className="chat-suggestions">
                                {SUGGESTIONS.map((suggestion) => (
                                    <button
                                        key={suggestion}
                                        type="button"
                                        onClick={() => ask(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {history.map((message, index) => (
                        <article
                            key={`${message.role}-${index}`}
                            className={`chat-message ${message.role}`}
                        >
                            <span className="chat-role">
                                {message.role === 'user' ? 'You' : 'Assistant'}
                            </span>
                            <p>{message.content}</p>
                        </article>
                    ))}

                    {streamingText ? (
                        <article className="chat-message assistant">
                            <span className="chat-role">Assistant</span>
                            <p>
                                {streamingText}
                                <span className="typing-dots" aria-hidden="true">
                                    <span />
                                    <span />
                                    <span />
                                </span>
                            </p>
                        </article>
                    ) : null}

                    {isLoading && !streamingText ? (
                        <div className="chat-typing" aria-label="Assistant is typing">
                            <span />
                            <span />
                            <span />
                        </div>
                    ) : null}

                    {error ? (
                        <p className="chat-error" role="alert">
                            {error}
                        </p>
                    ) : null}
                </div>

                <div className="input-field">
                    <input
                        type="text"
                        value={draft}
                        disabled={isLoading}
                        placeholder="Ask about disasters, weather or evacuation centres"
                        aria-label="Message"
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter') submit()
                        }}
                    />
                    <button type="button" onClick={submit} disabled={isLoading}>
                        {isLoading ? 'Sending…' : 'Send'}
                    </button>
                </div>
            </section>

            {newsItems.length > 0 ? (
                <section className="chat-news" aria-label="Search results">
                    <h2>Search results</h2>
                    <NewsList />
                </section>
            ) : null}
        </div>
    )
}