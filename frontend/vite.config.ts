import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.BACKEND_PORT ?? 8000}`,
        ws: true,
      },
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
})
