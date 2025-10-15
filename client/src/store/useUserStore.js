import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Global user store - manages authentication state and user data
 * Uses localStorage persistence to maintain session across page reloads
 */
export const useUserStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      
      login: (user, token) => set({ user, token }),
      
      logout: () => set({ user: null, token: null }),
      
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
    }),
    {
      name: 'vr-theatre-user',
    }
  )
);
