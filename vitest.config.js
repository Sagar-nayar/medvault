import { defineConfig } from 'vitest/config';

// unit + integration tests. the coverage thresholds are a hard gate,
// if coverage drops below them the Test stage fails
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/integration/**/*.test.js'],
    environment: 'node',
    env: { LOG_LEVEL: 'silent' },
    coverage: {
      provider: 'v8',
      include: ['server/**/*.js'],
      exclude: ['server/index.js'],
      reporter: ['text', 'text-summary', 'lcov', 'cobertura', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        lines: 85,
        statements: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
});
