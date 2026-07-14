import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from './types.ts';

const CLIP_DURATION = 0.55;
const CLIP_EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const DEFAULT_DARK_BG = '#141414';
const DEFAULT_LIGHT_BG = '#ffffff';

export interface ThemeTransitionOptions {
  darkBg?: string;
  lightBg?: string;
}

export function useThemeTransition(
  mode: ThemeMode,
  toggle: () => void,
  options?: ThemeTransitionOptions,
): {
  handleToggleTheme: () => void;
  transitionOverlay: ReactNode;
} {
  const [active, setActive] = useState(false);
  const [overlayBg, setOverlayBg] = useState('');
  const [clipOrigin, setClipOrigin] = useState('100% 0%');

  const handleToggleTheme = useCallback(() => {
    const goingDark = mode === 'light';
    const origin = goingDark ? '100% 0%' : '0% 100%';
    const oldBg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
    setOverlayBg(
      oldBg || (mode === 'dark' ? (options?.darkBg ?? DEFAULT_DARK_BG) : (options?.lightBg ?? DEFAULT_LIGHT_BG)),
    );
    setClipOrigin(origin);
    setActive(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toggle();
      });
    });
  }, [mode, toggle, options?.darkBg, options?.lightBg]);

  const transitionOverlay = (
    <AnimatePresence>
      {active && (
        <motion.div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: overlayBg,
            pointerEvents: 'none',
          }}
          initial={{ clipPath: `circle(150% at ${clipOrigin})` }}
          animate={{ clipPath: `circle(0% at ${clipOrigin})` }}
          exit={{ clipPath: `circle(0% at ${clipOrigin})` }}
          transition={{ duration: CLIP_DURATION, ease: CLIP_EASE }}
          onAnimationComplete={() => setActive(false)}
        />
      )}
    </AnimatePresence>
  );

  return { handleToggleTheme, transitionOverlay };
}
