import { create } from 'zustand';
import { Coordinates } from '../types';
import { MAKHACHKALA_CENTER } from '../data/locations';

interface LocationStore {
  current: Coordinates;
  lastUpdate: number;
  setLocation: (c: Coordinates) => void;
}

export const useLocationStore = create<LocationStore>((set) => ({
  current: MAKHACHKALA_CENTER,
  lastUpdate: Date.now(),
  setLocation: (c) => set({ current: c, lastUpdate: Date.now() }),
}));
