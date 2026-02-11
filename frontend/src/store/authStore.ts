import { create } from 'zustand';
import type { User } from '../types';
import { sensitiveData } from '../crypto/memoryGuard';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  masterKey: CryptoKey | null;
  vaultKey: CryptoKey | null;
  privateKey: CryptoKey | null;

  setUser: (user: User) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setMasterKey: (key: CryptoKey) => void;
  setVaultKey: (key: CryptoKey) => void;
  setPrivateKey: (key: CryptoKey) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  lock: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  masterKey: null,
  vaultKey: null,
  privateKey: null,

  setUser: (user) => set({ user, isAuthenticated: true }),

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  },

  setMasterKey: (key) => set({ masterKey: key }),
  setVaultKey: (key) => set({ vaultKey: key }),
  setPrivateKey: (key) => set({ privateKey: key }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    sensitiveData.clearAll();
    set({
      user: null,
      isAuthenticated: false,
      masterKey: null,
      vaultKey: null,
      privateKey: null,
    });
  },

  lock: () => {
    sensitiveData.clearAll();
    set({
      masterKey: null,
      vaultKey: null,
      privateKey: null,
    });
  },
}));
