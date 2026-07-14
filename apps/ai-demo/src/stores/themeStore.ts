import { configureTheme, useThemeStore } from '@interview-demo/shared-theme';

configureTheme({
  storageKey: 'theme-mode',
  domStrategy: 'attribute',
  domTarget: 'data-theme',
});

export { useThemeStore };
