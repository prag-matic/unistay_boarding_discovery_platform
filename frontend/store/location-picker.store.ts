import { create } from 'zustand';

interface LocationPickerState {
  pending: { lat: number; lng: number } | null;
  setPending: (lat: number, lng: number) => void;
  clearPending: () => void;
}

export const useLocationPickerStore = create<LocationPickerState>((set) => ({
  pending: null,
  setPending: (lat, lng) => set({ pending: { lat, lng } }),
  clearPending: () => set({ pending: null }),
}));
