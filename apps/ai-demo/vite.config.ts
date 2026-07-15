import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

const isAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    ...(isAnalyze
      ? [
          visualizer({
            emitFile: true,
            filename: 'stats.html',
            open: true,
          }),
        ]
      : []),
  ],
  optimizeDeps: {
    include: ['react-is', 'is-mobile', '@rc-component/cascader'],
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: true,
    target: 'es2020',
    modulePreload: {
      polyfill: false,
    },
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /node_modules[\/\\](react|react-dom|react-router|zustand|scheduler)/,
              priority: 30,
            },
            {
              name: 'antd',
              test: /node_modules[\/\\]antd[\/\\]/,
              priority: 25,
            },
            {
              name: 'antd-icons',
              test: /node_modules[\/\\]@ant-design[\/\\]icons/,
              priority: 26,
            },
            {
              name: 'antd-cssinjs',
              test: /node_modules[\/\\]@ant-design[\/\\]cssinjs/,
              priority: 26,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
