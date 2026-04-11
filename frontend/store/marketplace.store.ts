import { create } from 'zustand';
import type {
  CreateMarketplaceItemData,
  MarketplaceFilters,
  MarketplaceItem,
} from '@/types/marketplace.types';

interface MarketplaceState {
  items: MarketplaceItem[];
  myAds: MarketplaceItem[];
  filters: MarketplaceFilters;
  createDraft: Partial<CreateMarketplaceItemData>;
  setItems: (items: MarketplaceItem[]) => void;
  setMyAds: (items: MarketplaceItem[]) => void;
  setFilters: (filters: MarketplaceFilters) => void;
  clearFilters: () => void;
  setCreateDraft: (draft: Partial<CreateMarketplaceItemData>) => void;
  clearCreateDraft: () => void;
}

export const useMarketplaceStore = create<MarketplaceState>((set) => ({
  items: [],
  myAds: [],
  filters: {},
  createDraft: {
    adType: 'SELL',
    itemCondition: 'GOOD',
  },
  setItems: (items) => set({ items }),
  setMyAds: (myAds) => set({ myAds }),
  setFilters: (filters) => set({ filters }),
  clearFilters: () => set({ filters: {} }),
  setCreateDraft: (draft) =>
    set((state) => ({ createDraft: { ...state.createDraft, ...draft } })),
  clearCreateDraft: () =>
    set({ createDraft: { adType: 'SELL', itemCondition: 'GOOD' } }),
}));
