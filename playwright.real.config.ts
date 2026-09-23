import { defineConfig, devices } from '@playwright/test';

if (!/^(127\.0\.0\.1|localhost):18080$/.test(process.env.FIRESTORE_EMULATOR_HOST || '') ||
    !/^(127\.0\.0\.1|localhost):19099$/.test(process.env.FIREBASE_AUTH_EMULATOR_HOST || '')) {
  throw new Error('Real E2E tests require local Firebase emulators. Run npm run test:e2e:real.');
}

export default defineConfig({
  testDir: './tests/e2e-real',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node --import tsx server.ts',
    env: {
      ...process.env,
      FIREBASE_PROJECT_ID: 'demo-nexo-e2e',
      FIREBASE_DATABASE_ID: '(default)',
      FIREBASE_SERVICE_ACCOUNT_JSON: '',
      GOOGLE_SERVICE_ACCOUNT_JSON: '',
      RESEND_API_KEY: '',
      VITE_ENABLE_E2E_AUTH: 'false',
      VITE_USE_FIREBASE_EMULATORS: 'true',
    },
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'real-backend-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'real-backend-mobile', use: { ...devices['Pixel 7'] } },
  ],
});
