import '@testing-library/jest-dom/vitest';

// setImmediate is a Node.js API used by React 19's scheduler in jsdom.
declare function setImmediate(callback: (...args: unknown[]) => void, ...args: unknown[]): unknown;

import { afterEach } from 'vitest';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserverMock;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Flush pending setImmediate callbacks (e.g. React 19 passive effects) after
// each test to prevent "window is not defined" when jsdom is torn down.
afterEach(async () => {
  await new Promise<void>((resolve) => {
    setImmediate(() => {
      resolve();
    });
  });
});
