import { create } from 'zustand'

interface AIProps {
  api: string;
  selectedModel: string;
  key: string;
  searchKey: string;
  setAPI: (api: string) => void;
  setSelectedModel: (model: string) => void;
  setKey: (key: string) => void;
  setSearchKey: (key: string) => void;
}

export const useAIProps = create<AIProps>((set) => ({
  api: '',
  selectedModel: '',
  key: '',
  searchKey: '',
  setAPI: (api) => set({ api: api }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setKey: (key) => set({key: key}),
  setSearchKey: (searchKey) => set({searchKey: searchKey})
}))