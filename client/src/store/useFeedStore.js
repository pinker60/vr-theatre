import { create } from 'zustand';

/**
 * Feed store - manages content filtering and sorting preferences
 */
export const useFeedStore = create((set) => ({
  filters: {
    tag: 'all',
    sortBy: 'recent', // 'recent' or 'recommended'
  },
  
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
  
  resetFilters: () => set({
    filters: { tag: 'all', sortBy: 'recent' }
  }),
}));
