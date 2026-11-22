import { create } from 'zustand'

import type { ModelInfo } from '../types/api'

type SettingsState = {
    username: string
    api: string
    apiKey: string
    searchKey: string
    selectedModel: string
    models: ModelInfo[]
    setUsername: (username: string) => void
    setApi: (api: string) => void
    setApiKey: (apiKey: string) => void
    setSearchKey: (searchKey: string) => void
    setSelectedModel: (selectedModel: string) => void
    setModels: (models: ModelInfo[]) => void
    reset: () => void
}

const INITIAL_STATE = {
    username: '',
    api: '',
    apiKey: '',
    searchKey: '',
    selectedModel: '',
    models: [] as ModelInfo[],
}

/**
 * Endpoint and model selection.
 *
 * Deliberately NOT wrapped in zustand's `persist` middleware: that would write
 * the API key into localStorage in plain text. Persisting it belongs on the
 * backend, behind a user account.
 */
export const useSettingsStore = create<SettingsState>((set) => ({
    ...INITIAL_STATE,
    setUsername: (username) => set({ username }),
    setApi: (api) => set({ api }),
    setApiKey: (apiKey) => set({ apiKey }),
    setSearchKey: (searchKey) => set({ searchKey }),
    setSelectedModel: (selectedModel) => set({ selectedModel }),
    setModels: (models) => set({ models }),
    reset: () => set(INITIAL_STATE),
}))
