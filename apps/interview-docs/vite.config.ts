import react from '@vitejs/plugin-react'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [react()],
  base: '/interview-demo/',
  server: {
    port: 5000,
    host: 'localhost',
    fs: {
      allow: ['../../../..'],
    },
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules/ }],
        },
      },
    },
  },
})
