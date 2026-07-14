import { configureThemeHook, useTheme } from '@interview-demo/shared-theme';

configureThemeHook({
  storageKey: 'theme',
  domStrategy: 'class',
  domTarget: 'dark',
});

export { useTheme };
