import { create } from 'zustand';
import type { ThemeConfig, ThemeMode } from './types.ts';
import { DEFAULT_CONFIG, applyTheme, getInitialTheme } from './dom.ts';

interface ThemeState {
  mode: ThemeMode;
  toggle: () => void;
}

let _config: Required<ThemeConfig> = { ...DEFAULT_CONFIG };

/**
 * 模块求值阶段**不要**写 DOM：各 app 的 storageKey / DOM 策略由 configureTheme 注入，
 * 而包默认配置（storageKey: 'theme-mode'）通常读不到站点真实偏好，
 * 此时 applyTheme 会把 index.html 内联脚本按真实 storageKey 提前写入的暗色状态抹掉，
 * 表现为「刷新后主题丢失」。初始 DOM 状态一律交给 configureTheme() 应用。
 */
export const useThemeStore = create<ThemeState>((set: (partial: ThemeState | Partial<ThemeState> | ((state: ThemeState) => ThemeState | Partial<ThemeState>)) => void) => ({
  mode: getInitialTheme(_config),
  toggle: () => {
    set((s: ThemeState) => {
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
