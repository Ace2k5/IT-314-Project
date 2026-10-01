import { useEffect, useRef, useState, type FormEvent } from 'react'

type ChatMessage = {
    role: 'user' | 'assistant',
    content: string
}

type ChatCompletionResponse = {
    choices?: { message?: { content?: string | null } }[]
    error?: { message?: string }
}

export function Chat() {
    const [messages, setMessages] = useState<ChatMessage[]>([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const conversationRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight })
    }, [messages, loading])

    const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const content = input.trim()
        if (!content || loading) return

        const { VITE_OPENAI_BASE_URL, VITE_OPENAI_API_KEY, VITE_OPENAI_MODEL } = import.meta.env
        if (!VITE_OPENAI_BASE_URL || !VITE_OPENAI_API_KEY || !VITE_OPENAI_MODEL) {
            setError('Chat is not configured. Set VITE_OPENAI_BASE_URL, VITE_OPENAI_API_KEY, and VITE_OPENAI_MODEL.')
            return
        }

        const history = [...messages, { role: 'user' as const, content }]
        setMessages(history)
        setInput('')
        setError('')
        setLoading(true)

        try {
            const baseUrl = VITE_OPENAI_BASE_URL.replace(/\/+$/, '')
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${VITE_OPENAI_API_KEY}`,
                },
                body: JSON.stringify({ model: VITE_OPENAI_MODEL, messages: history }),
            })
            const result = await response.json() as ChatCompletionResponse

            if (!response.ok) {
                throw new Error(result.error?.message || `Request failed (${response.status}).`)
            }

            const reply = result.choices?.[0]?.message?.content
            if (!reply) throw new Error('The chat endpoint returned no assistant message.')

            setMessages([...history, { role: 'assistant', content: reply }])
        } catch (caughtError) {
            setError(caughtError instanceof Error ? caughtError.message : 'Unable to send the message.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="chat-panel" aria-label="Chat">
            <header className="chat-header">
                <h2>Chat</h2>
                <span>{import.meta.env.VITE_OPENAI_MODEL || 'Chat Bot'}</span>
            </header>
            <div className="chat-messages" ref={conversationRef} role="log" aria-live="polite">
                {messages.length === 0 && <p className="chat-empty">Start a conversation.</p>}
                {messages.map((message, index) => (
                    <div className={`chat-message chat-message-${message.role}`} key={`${index}-${message.role}`}>
                        <span>{message.role === 'user' ? 'You' : 'Assistant'}</span>
                        <p>{message.content}</p>
                    </div>
                ))}
                {loading && <p className="chat-loading" role="status">Thinking...</p>}
            </div>
            {error && <p className="chat-error" role="alert">{error}</p>}
            <form className="chat-form" onSubmit={sendMessage}>
                <label className="chat-input-label" htmlFor="chat-message">Message</label>
                <textarea
                    id="chat-message"
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Write a message..."
                    rows={2}
                    disabled={loading}
                />
                <button type="submit" disabled={loading || !input.trim()}>
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </form>
        </section>
    )
}