import { create } from 'zustand';
import type { ThemeConfig, ThemeMode } from './types.ts';
import { DEFAULT_CONFIG, applyTheme, getInitialTheme } from './dom.ts';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

let _config: Required<ThemeConfig> = { ...DEFAULT_CONFIG };

const initialMode = getInitialTheme(_config);
applyTheme(initialMode, _config);

export const useThemeStore = create<ThemeState>((set) => ({
  mode: initialMode,
  toggle: () => {
    set((s) => {
      const next: ThemeMode = s.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem(_config.storageKey, next);
      applyTheme(next, _config);
      return { mode: next };
    });
  },
}));

export function configureTheme(config: Partial<ThemeConfig>): void {
  _config = { ..._config, ...config };
  const mode = getInitialTheme(_config);
  applyTheme(mode, _config);
  useThemeStore.setState({ mode });
}
