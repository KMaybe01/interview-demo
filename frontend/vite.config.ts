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
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|react-router|zustand)/,
              priority: 20,
            },
            {
              name: 'antd',
              test: /node_modules[\\/](antd|@ant-design)/,
              priority: 15,
            },
            {
              name: 'echarts',
              test: /node_modules[\\/]echarts/,
              priority: 15,
            },
            {
              name: 'gis',
              test: /node_modules[\\/]ol/,
              priority: 15,
            },
            {
              name: 'form',
              test: /node_modules[\\/]@rjsf/,
              priority: 15,
            },
          ],
        },
      },
    },
  },
})
