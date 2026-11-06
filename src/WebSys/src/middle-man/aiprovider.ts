import { create } from 'zustand'

interface AppState {
  api: string;
  selectedModel: string;
  key: string;
  setAPI: (api: string) => void;
  setSelectedModel: (model: string) => void;
  setKey: (key: string) => void;
}

export const useAIProps = create<AppState>((set) => ({
  api: '',
  selectedModel: '',
  key: '',
  setAPI: (api) => set({ api: api }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setKey: (key) => set({key: key})
}))