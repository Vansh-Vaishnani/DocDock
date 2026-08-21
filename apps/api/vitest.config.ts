import path from 'path';

import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.PORT = '5000';
process.env.MONGODB_URI = 'mongodb://localhost:27017/docdock_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'test_jwt_access_secret_32_characters_minimum';
process.env.JWT_REFRESH_SECRET = 'test_jwt_refresh_secret_32_characters_minimum';
process.env.COOKIE_SECRET = 'test_cookie_secret_32_characters_minimum';
process.env.FRONTEND_URL = 'http://localhost:3000';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/types/**'],
      statements: 90,
      branches: 85,
      functions: 90,
      lines: 90,
    },
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
