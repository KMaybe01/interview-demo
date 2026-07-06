import { create } from 'zustand';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  parseToken,
} from '../utils/token.ts';

export interface UserInfo {
  sub: string;
  role: string;
}

interface AuthState {
  user: UserInfo | null;
  isLoggedIn: boolean;
  setUser: (user: UserInfo | null) => void;
  login: (user: UserInfo) => void;
  logout: () => void;
  hydrate: () => void;
}

function initUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const token = getAccessToken();
  if (!token) return null;
  if (isTokenExpired(token)) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      return null;
    }
    const payload = parseToken(token);
    if (!payload) return null;
    return { sub: payload.sub, role: payload.role };
  }
  const payload = parseToken(token);
  if (!payload) return null;
  return { sub: payload.sub, role: payload.role };
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  setUser: (user) => {
    set({ user, isLoggedIn: user != null });
  },
  login: (user) => {
    set({ user, isLoggedIn: true });
  },
  logout: () => {
    set({ user: null, isLoggedIn: false });
  },
  hydrate: () => {
    const user = initUser();
    set({ user, isLoggedIn: user != null });
  },
}));

// Hydrate on first import in browser
if (typeof window !== 'undefined') {
  useAuthStore.getState().hydrate();
}
