import { create } from 'zustand';
import type { Boarding, BoardingFilters, SortOption, CreateBoardingData } from '@/types/boarding.types';

interface BoardingState {
  savedIds: string[];
  filters: BoardingFilters;
  sortOption: SortOption;
  createDraft: Partial<CreateBoardingData>;
  toggleSaved: (id: string) => void;
  isSaved: (id: string) => boolean;
  setSavedIds: (ids: string[]) => void;
  setFilters: (filters: BoardingFilters) => void;
  clearFilters: () => void;
  setSortOption: (sort: SortOption) => void;
  setCreateDraft: (data: Partial<CreateBoardingData>) => void;
  clearCreateDraft: () => void;
}

export const useBoardingStore = create<BoardingState>((set, get) => ({
  savedIds: [],
  filters: {},
  sortOption: 'RELEVANCE',
  createDraft: {},

  toggleSaved: (id) => {
    const { savedIds } = get();
    if (savedIds.includes(id)) {
      set({ savedIds: savedIds.filter((s) => s !== id) });
    } else {
      set({ savedIds: [...savedIds, id] });
    }
  },

  isSaved: (id) => get().savedIds.includes(id),

  setSavedIds: (ids) => set({ savedIds: ids }),

  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  setSortOption: (sortOption) => set({ sortOption }),

  setCreateDraft: (data) =>
    set((state) => ({ createDraft: { ...state.createDraft, ...data } })),
  clearCreateDraft: () => set({ createDraft: {} }),
}));
