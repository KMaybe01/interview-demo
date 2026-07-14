import { create } from 'zustand';

const THEME_KEY = 'theme-mode';
type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

function getInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function applyMode(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

// Sync DOM class immediately on module load (before React render)
applyMode(getInitialMode());

export const useThemeStore = create<ThemeState>((set) => ({
  mode: getInitialMode(),
  toggle: () => {
    set((s) => {
      const next = s.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem(THEME_KEY, next);
      applyMode(next);
      return { mode: next };
    });
  },
}));
