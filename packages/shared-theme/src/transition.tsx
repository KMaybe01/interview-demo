import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import type { ThemeMode } from './types.ts';

const CLIP_DURATION = 0.55;
const CLIP_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

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
  const [shrinking, setShrinking] = useState(false);

  const handleToggleTheme = useCallback(() => {
    const goingDark = mode === 'light';
    const origin = goingDark ? '100% 0%' : '0% 100%';
    const oldBg = getComputedStyle(document.documentElement).getPropertyValue('--c-bg').trim();
    setOverlayBg(
      oldBg ||
        (mode === 'dark'
          ? (options?.darkBg ?? DEFAULT_DARK_BG)
          : (options?.lightBg ?? DEFAULT_LIGHT_BG)),
    );
    setClipOrigin(origin);
    setActive(true);
    setShrinking(false);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShrinking(true);
        toggle();
      });
    });
  }, [mode, toggle, options?.darkBg, options?.lightBg]);

  const transitionOverlay = active ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        // 用 vw/vh 而不是 inset: 0：inset 只覆盖「布局视口」，
        // 右侧滚动条槽位漏在遮罩之外，主题切换时那一条会先变色
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        backgroundColor: overlayBg,
        pointerEvents: 'none',
        clipPath: shrinking ? `circle(0% at ${clipOrigin})` : `circle(150% at ${clipOrigin})`,
        transition: `clip-path ${CLIP_DURATION}s ${CLIP_EASE}`,
      }}
      onTransitionEnd={(e) => {
        if (e.propertyName.includes('clip')) {
          setActive(false);
        }
      }}
    />
  ) : null;

  return { handleToggleTheme, transitionOverlay };
}
