import { defineConfig } from 'vitest/config';

// smoke tests that run AFTER deploying, against the real running container
// (staging first, then prod). TARGET_URL says which one
export default defineConfig({
  test: {
    include: ['tests/smoke/**/*.test.js'],
    environment: 'node',
    testTimeout: 15_000,
    retry: 1,
  },
});
