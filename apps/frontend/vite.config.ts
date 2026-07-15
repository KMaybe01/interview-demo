import babel from '@rolldown/plugin-babel'
import {defineConfig} from 'vitest/config'
import react, {reactCompilerPreset} from '@vitejs/plugin-react'
import {visualizer} from 'rollup-plugin-visualizer'

const isAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      exclude: 'node_modules/**',
    }),
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
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
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
    chunkSizeWarningLimit: 400,
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
            {
              name: 'echarts',
              test: /node_modules[\/\\]echarts/,
              priority: 25,
            },
            {
              name: 'motion',
              test: /node_modules[\/\\](motion|framer-motion)/,
              priority: 27,
            },
            {
              name: 'gis',
              test: /node_modules[\/\\]ol/,
              priority: 25,
            },
            {
              name: 'form',
              test: /node_modules[\/\\](@rjsf|ajv)/,
              priority: 25,
            },
            {
              name: 'dayjs',
              test: /node_modules[\/\\]dayjs/,
              priority: 24,
            },
            {
              name: 'vendor-common',
              test: /node_modules[\/\\](axios|web-vitals|react-window)/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
