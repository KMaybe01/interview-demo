import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { createApiHandler } from './server/handler.ts';

/**
 * 把 BFF 直接挂到 Vite dev/preview server，让 `bun run dev` 一条命令跑起来。
 * 生产想单独部署时，用 `bun run server`（见 server/index.ts）起同一个 handler。
 */
function aiCourseApi(): Plugin {
  return {
    name: 'ai-course-api',
    configureServer(server) {
      server.middlewares.use(createApiHandler());
    },
    configurePreviewServer(server) {
      server.middlewares.use(createApiHandler());
    },
  };
}

export default defineConfig({
  plugins: [react(), aiCourseApi()],
  server: { port: 5199, host: '127.0.0.1' },
  build: {
    sourcemap: false,
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: true,
    modulePreload: { polyfill: false },
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
