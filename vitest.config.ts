import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['tests/env.ts'],
    testTimeout: 45000,
    hookTimeout: 90000,
    exclude: ['tests/e2e/**', 'node_modules/**'],
    // Run suites sequentially — each suite owns the same test fixtures
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
