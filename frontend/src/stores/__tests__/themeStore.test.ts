import { beforeEach, describe, expect, it } from 'vitest';
import { useThemeStore } from '../themeStore.ts';

beforeEach(() => {
  localStorage.clear();
  useThemeStore.setState({ mode: 'light' });
});

describe('themeStore', () => {
  it('starts with light mode by default', () => {
    expect(useThemeStore.getState().mode).toBe('light');
  });

  it('toggles from light to dark', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().mode).toBe('dark');
    expect(localStorage.getItem('theme-mode')).toBe('dark');
  });

  it('toggles from dark to light', () => {
    useThemeStore.setState({ mode: 'dark' });
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().mode).toBe('light');
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });

  it('persists mode to localStorage', () => {
    useThemeStore.getState().toggle();
    expect(localStorage.getItem('theme-mode')).toBe('dark');
    useThemeStore.getState().toggle();
    expect(localStorage.getItem('theme-mode')).toBe('light');
  });
});
