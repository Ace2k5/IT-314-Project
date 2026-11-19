import { create } from 'zustand'

import type { NewsItem } from '../types/api'

type NewsState = {
    items: NewsItem[]
    setNews: (items: NewsItem[]) => void
    clearNews: () => void
}

/** Search results attached to the latest assistant answer, shown in both panels. */
export const useNewsStore = create<NewsState>((set) => ({
    items: [],
    setNews: (items) => set({ items }),
    clearNews: () => set({ items: [] }),
}))
