import { create } from 'zustand'

interface AppState {
  api: string;
  selectedModel: string;
  key: string;
  mcp: string;
  setAPI: (api: string) => void;
  setSelectedModel: (model: string) => void;
  setKey: (key: string) => void;
  setMCP: (key: string) => void;
}

export const useAIProps = create<AppState>((set) => ({
  api: '',
  selectedModel: '',
  key: '',
  mcp: '',
  setAPI: (api) => set({ api: api }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setKey: (key) => set({key: key}),
  setMCP: (mcp) => set({mcp: mcp})
}))