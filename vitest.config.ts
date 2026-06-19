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
    // Run files sequentially — test files share the same DB and fixtures; concurrent
    // file execution causes cross-file cleanup races (e.g. test_key_* deletion).
    fileParallelism: false,
    sequence: { concurrent: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
