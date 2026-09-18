import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    setupFiles: ['./src/tests/setup.ts'],
    // Tests share one MongoDB test database; never run files in parallel.
    fileParallelism: false,
  },
});