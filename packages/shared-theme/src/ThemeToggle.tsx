import { motion } from 'motion/react';
import type { ThemeMode } from './types.ts';

interface ThemeToggleProps {
  mode: ThemeMode;
  onToggle: () => void;
}

export function ThemeToggle({ mode, onToggle }: ThemeToggleProps) {
  return (
    <motion.label
      className="theme-switch"
      title={mode === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={mode === 'dark'}
        onChange={onToggle}
        style={{ display: 'none' }}
      />
      <span
        style={{
          position: 'relative',
          width: 44,
          height: 24,
          borderRadius: 12,
          background: mode === 'dark' ? '#333355' : '#e2e2e3',
          transition: 'background 0.3s',
        }}
      >
        <motion.span
          initial={false}
          style={{
            position: 'absolute',
            top: 2,
            left: 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: mode === 'dark' ? '#1a1a2e' : '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
          animate={{
            left: mode === 'dark' ? 22 : 2,
            rotate: mode === 'dark' ? 360 : 0,
          }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        >
          <motion.svg
            key={`sun-${mode}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={mode === 'dark' ? '#666' : '#f59e0b'}
            strokeWidth="2"
            style={{ position: 'absolute' }}
            initial={{ rotate: 0, scale: 1 }}
            animate={{
              rotate: mode === 'dark' ? 90 : 0,
              scale: mode === 'dark' ? 0 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </motion.svg>
          <motion.svg
            key={`moon-${mode}`}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={mode === 'dark' ? '#a78bfa' : '#999'}
            strokeWidth="2"
            style={{ position: 'absolute' }}
            initial={{ rotate: -90, scale: 0 }}
            animate={{
              rotate: mode === 'dark' ? 0 : -90,
              scale: mode === 'dark' ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </motion.svg>
        </motion.span>
      </span>
    </motion.label>
  );
}
