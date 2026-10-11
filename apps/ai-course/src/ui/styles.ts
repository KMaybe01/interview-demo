import type { CSSProperties } from 'react';

/**
 * 轻量主题。本仓库约定「样式只用组件库 + style prop」，
 * 所以这里导出的是一组内联样式常量，而不是 CSS 文件。
 */
export const colors = {
  bg: '#0f1117',
  panel: '#171a23',
  panelSoft: '#1e222c',
  border: '#2a2f3a',
  text: '#e6e8ee',
  textDim: '#9aa3b2',
  brand: '#6366f1',
  brandSoft: '#312e81',
  warn: '#f59e0b',
  success: '#22c55e',
  danger: '#ef4444',
} as const;

export const layout: Record<'shell' | 'rail' | 'main' | 'header', CSSProperties> = {
  shell: {
    display: 'flex',
    height: '100vh',
    background: colors.bg,
    color: colors.text,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  rail: {
    width: 268,
    flexShrink: 0,
    borderRight: `1px solid ${colors.border}`,
    padding: 16,
    overflowY: 'auto',
    background: colors.panel,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: {
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
};

export const card: CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  background: colors.panelSoft,
  padding: 14,
};

export const buttonStyle = (variant: 'primary' | 'ghost' | 'danger' = 'ghost'): CSSProperties => {
  const base: CSSProperties = {
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    color: colors.text,
    background: 'transparent',
  };
  if (variant === 'primary') {
    return { ...base, background: colors.brand, borderColor: colors.brand, color: '#fff' };
  }
  if (variant === 'danger') {
    return { ...base, background: colors.danger, borderColor: colors.danger, color: '#fff' };
  }
  return base;
};

export const badge = (tone: 'ok' | 'warn' | 'info' = 'info'): CSSProperties => {
  const toneBg = tone === 'ok' ? colors.success : tone === 'warn' ? colors.warn : colors.brand;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '3px 10px',
    borderRadius: 999,
    fontSize: 12,
    background: `${toneBg}22`,
    color: toneBg,
    border: `1px solid ${toneBg}55`,
  };
};
