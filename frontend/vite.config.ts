import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
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
    chunkSizeWarningLimit: 600,
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
              test: /node_modules[\/\\](antd|@ant-design)/,
              priority: 25,
            },
            {
              name: 'echarts',
              test: /node_modules[\/\\]echarts/,
              priority: 25,
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
              name: 'vendor-common',
              test: /node_modules[\/\\](axios|web-vitals|react-window)/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
})
