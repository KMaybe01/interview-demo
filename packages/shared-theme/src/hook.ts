import { useCallback, useSyncExternalStore } from 'react';
import type { ThemeConfig, ThemeMode } from './types.ts';
import { DEFAULT_CONFIG, getDOMSnapshot, subscribeToDOM, applyTheme } from './dom.ts';

let _config: Required<ThemeConfig> = { ...DEFAULT_CONFIG };

export function configureThemeHook(config: Partial<ThemeConfig>): void {
  _config = { ..._config, ...config };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => subscribeToDOM(cb, _config),
    () => getDOMSnapshot(_config),
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(_config.storageKey, next);
    applyTheme(next, _config);
  }, [theme]);

  return { theme, toggleTheme };
}
