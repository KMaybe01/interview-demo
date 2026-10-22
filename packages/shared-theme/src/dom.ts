import type { ThemeConfig, ThemeMode } from './types.ts';

export const DEFAULT_CONFIG: ThemeConfig = {
  domStrategy: 'class',
  domTarget: 'dark',
  storageKey: 'theme-mode',
};

export function getInitialTheme(config: ThemeConfig): ThemeMode {
  try {
    const stored = localStorage.getItem(config.storageKey);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(mode: ThemeMode, config: ThemeConfig): void {
  if (config.domStrategy === 'attribute') {
    document.documentElement.setAttribute(config.domTarget, mode);
  } else {
    document.documentElement.classList.toggle(config.domTarget, mode === 'dark');
  }
}

export function getDOMSnapshot(config: ThemeConfig): ThemeMode {
  if (config.domStrategy === 'attribute') {
    return document.documentElement.getAttribute(config.domTarget) === 'dark' ? 'dark' : 'light';
  }
  return document.documentElement.classList.contains(config.domTarget) ? 'dark' : 'light';
}

export function subscribeToDOM(callback: () => void, config?: ThemeConfig): () => void {
  const attributeFilter = config?.domStrategy === 'attribute' ? [config.domTarget] : ['class'];
  const observer = new MutationObserver(() => callback());
  observer.observe(document.documentElement, { attributeFilter, attributes: true });
  return () => observer.disconnect();
}
