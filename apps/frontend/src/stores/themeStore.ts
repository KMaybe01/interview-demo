import { configureTheme, useThemeStore } from '@interview-demo/shared-theme';

configureTheme({
  storageKey: 'theme-mode',
  domStrategy: 'class',
  domTarget: 'dark',
});

export { useThemeStore };
