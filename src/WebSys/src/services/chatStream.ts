import { backend } from '../api/backendClient'
import { useChatStore } from '../stores/useChatStore'
import { useNewsStore } from '../stores/useNewsStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import type { NewsItem } from '../types/api'

/** One frame of the SSE stream the backend forwards, plus our two own events. */
type StreamFrame = {
    error?: string
    type?: 'news_data' | 'reset'
    payload?: NewsItem[]
    choices?: { delta?: { content?: string } }[]
}

export const NEWS_QUERY = 'Search up the latest news regarding Typhoons and Earthquakes.'

type SendOptions = {
    /** True only when the user pressed send, so the news trigger keeps their draft. */
    clearDraft?: boolean
}

/**
 * Send one chat turn and stream the answer into the store.
 *
 * This is a plain module-level function on purpose: it is called from the
 * component tree *and* from the news trigger, and it must not be a hook.
 */
export async function sendChatMessage(
    input: string,
    sessionId: string,
    { clearDraft = false }: SendOptions = {},
): Promise<NewsItem[]> {
    const chat = useChatStore.getState()

    if (chat.isLoading) {
        console.warn('[chat] A request is already in flight; ignoring this one.')
        return []
    }

    const text = input.trim()
    if (!text) return []

    const { api, apiKey, searchKey, selectedModel } = useSettingsStore.getState()
    if (!api || !selectedModel) {
        chat.setError('Pick an endpoint and a model in Settings first.')
        return []
    }

    chat.appendMessage({ role: 'user', content: text })
    if (clearDraft) chat.setDraft('')
    chat.setError(null)
    chat.setStreamingText('')
    chat.setLoading(true)

    let assistantText = ''
    let news: NewsItem[] = []

    try {
        const response = await backend.chatCompletions({
            api,
            apiKey,
            searchKey,
            selectedModel,
            history: useChatStore.getState().history,
            sessionId,
        })

        if (!response) {
            chat.setError('Could not reach the backend. Is it running on port 9999?')
            return []
        }
        if (!response.ok || !response.body) {
            chat.setError(`The model endpoint answered with ${response.status}.`)
            return []
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        for (;;) {
            const { value, done } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            // SSE frames are separated by a blank line.
            const frames = buffer.split('\n\n')
            buffer = frames.pop() ?? ''

            for (const frame of frames) {
                const line = frame.trim()
                if (!line.startsWith('data:')) continue

                const data = line.slice('data:'.length).trim()
                if (data === '[DONE]') continue

                let parsed: StreamFrame
                try {
                    parsed = JSON.parse(data) as StreamFrame
                } catch {
                    console.warn('[chat] Skipped a frame that was not valid JSON.')
                    continue
                }

                if (parsed.error) {
                    chat.setError(parsed.error)
                    continue
                }
                if (parsed.type === 'news_data' && parsed.payload) {
                    news = parsed.payload
                    useNewsStore.getState().setNews(parsed.payload)
                    continue
                }
                if (parsed.type === 'reset') {
                    assistantText = ''
                    chat.setStreamingText('')
                    continue
                }

                const token = parsed.choices?.[0]?.delta?.content
                if (token) {
                    assistantText += token
                    chat.setStreamingText(assistantText)
                }
            }
        }
    } catch (error) {
        console.error('[chat] The stream failed.', error)
        chat.setError('The connection dropped while the answer was streaming.')
    } finally {
        if (assistantText) {
            chat.appendMessage({ role: 'assistant', content: assistantText })
        }
        chat.setStreamingText('')
        chat.setLoading(false)
    }

    return news
}
