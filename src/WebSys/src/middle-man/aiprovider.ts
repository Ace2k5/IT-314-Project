import { create } from 'zustand'

interface AIProps {
  api: string;
  selectedModel: string;
  key: string;
  mcp: string;
  setAPI: (api: string) => void;
  setSelectedModel: (model: string) => void;
  setKey: (key: string) => void;
  setMCP: (key: string) => void;
}

export const useAIProps = create<AIProps>((set) => ({
  api: '',
  selectedModel: '',
  key: '',
  mcp: '',
  setAPI: (api) => set({ api: api }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setKey: (key) => set({key: key}),
  setMCP: (mcp) => set({mcp: mcp})
}))