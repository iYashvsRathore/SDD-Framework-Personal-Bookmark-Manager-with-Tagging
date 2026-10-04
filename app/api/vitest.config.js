import { defineConfig } from 'vitest/config';

// Q4 measures coverage on the business-logic layer named in hld.md section 5:
// api/src/services plus api/src/lib. Routes and data access are excluded from the
// measurement, not from the tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/services/**/*.js', 'src/lib/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
