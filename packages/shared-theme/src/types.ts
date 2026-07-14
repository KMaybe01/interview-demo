export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  storageKey: string;
  domStrategy: 'class' | 'attribute';
  domTarget: string;
}
