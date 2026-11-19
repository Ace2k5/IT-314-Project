import { create } from 'zustand'

import type { ChatMessage } from '../types/api'

type ChatState = {
    /** True while a request is streaming; the composer is disabled meanwhile. */
    isLoading: boolean
    /** What the user has typed but not sent yet. */
    draft: string
    history: ChatMessage[]
    /** Assistant text received so far for the in-flight answer. */
    streamingText: string
    error: string | null
    setLoading: (isLoading: boolean) => void
    setDraft: (draft: string) => void
    setHistory: (history: ChatMessage[]) => void
    appendMessage: (message: ChatMessage) => void
    setStreamingText: (streamingText: string) => void
    setError: (error: string | null) => void
    reset: () => void
}

const INITIAL_STATE = {
    isLoading: false,
    draft: '',
    streamingText: '',
    error: null as string | null,
}

export const useChatStore = create<ChatState>((set) => ({
    ...INITIAL_STATE,
    history: [],
    setLoading: (isLoading) => set({ isLoading }),
    setDraft: (draft) => set({ draft }),
    setHistory: (history) => set({ history }),
    appendMessage: (message) =>
        set((state) => ({ history: [...state.history, message] })),
    setStreamingText: (streamingText) => set({ streamingText }),
    setError: (error) => set({ error }),
    reset: () => set({ ...INITIAL_STATE, history: [] }),
}))
