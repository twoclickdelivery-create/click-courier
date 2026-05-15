import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Courier, TransportType } from '../types';
import { defaultCourier } from '../data/mockCouriers';
import { supabase } from '../lib/supabase';

export type UserRole = 'courier' | 'dispatcher';

interface AuthStore {
  isAuthenticated: boolean;
  role: UserRole;
  courier: Courier | null;
  isOnShift: boolean;
  shiftStartedAt: number | null;

  login: (phone: string, role?: UserRole, transport?: Courier['transport'], name?: string) => void;
  logout: () => void;
  toggleShift: () => void;
  setShift: (on: boolean) => void;
  updateCourier: (patch: Partial<Courier>) => void;
  updateTransport: (transport: TransportType) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      role: 'courier',
      courier: null,
      isOnShift: false,
      shiftStartedAt: null,

      login: (phone: string, role: UserRole = 'courier', transport?: Courier['transport'], name?: string) => {
        set({
          isAuthenticated: true,
          role,
          courier: role === 'courier'
            ? {
                ...defaultCourier,
                phone,
                name: name ?? defaultCourier.name,
                transport: transport ?? defaultCourier.transport,
              }
            : null,
        });
      },

      logout: async () => {
        await supabase.auth.signOut();
        set({
          isAuthenticated: false,
          role: 'courier',
          courier: null,
          isOnShift: false,
          shiftStartedAt: null,
        });
      },

      toggleShift: () => {
        const next = !get().isOnShift;
        set({
          isOnShift: next,
          shiftStartedAt: next ? Date.now() : null,
        });
      },

      setShift: (on: boolean) => {
        set({
          isOnShift: on,
          shiftStartedAt: on ? Date.now() : null,
        });
      },

      updateCourier: (patch) => {
        const c = get().courier;
        if (!c) return;
        set({ courier: { ...c, ...patch } });
      },

      updateTransport: (transport) => {
        const c = get().courier;
        if (!c) return;
        set({ courier: { ...c, transport } });
      },
    }),
    {
      name: 'click-courier-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
