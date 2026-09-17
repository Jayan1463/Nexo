import { expect, test } from '@playwright/test';

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
    };
  });

  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 2);
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(overflow.bodyClientWidth + 2);
}

test.describe('Nexo Cloud public app', () => {
  test('landing page loads, fits the viewport, and does not expose demo seeding UI', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Your Infrastructure. One Intelligent View.' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'View Status' })).toBeVisible();
    await expect(page.getByText('Demo Data')).toHaveCount(0);
    await expect(page.getByText('Generate Demo Telemetry')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Login with Email' })).toBeVisible();

    await expectNoHorizontalOverflow(page);
  });

  test('auth form switches cleanly between login and signup', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Sign Up' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByPlaceholder('Display name')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();

    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByPlaceholder('Display name')).toHaveCount(0);

    await expectNoHorizontalOverflow(page);
  });
});

test.describe('Nexo Cloud API safeguards', () => {
  test('health endpoint responds and protected ingestion rejects unsafe requests', async ({ request }) => {
    const health = await request.get('/api/health');
    await expect(health).toBeOK();
    expect(await health.json()).toEqual(expect.objectContaining({ status: 'ok' }));

    const legacyDemo = await request.post('/api/metrics/ingest', {
      data: { projectId: 'demo', metrics: [] },
    });
    expect(legacyDemo.status()).toBe(410);

    const telemetryMissingKey = await request.post('/api/v1/telemetry', {
      data: { cpu: 10, memory: 20, network: 1 },
    });
    expect(telemetryMissingKey.status()).toBe(401);

    const logsMissingKey = await request.post('/api/v1/logs', {
      data: { level: 'info', service: 'api', message: 'hello' },
    });
    expect(logsMissingKey.status()).toBe(401);
  });
});

test.describe('Nexo Cloud authenticated dashboard shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nexo:e2e-auth', 'owner');
    });
  });

  test('owner dashboard loads without demo navigation and key modules are reachable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Nexo Cloud').first()).toBeVisible();
    await expect(page.getByText('Demo Data')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();

    const modules = [
      { nav: 'Alerts', heading: 'Alert Management' },
      { nav: 'Status Page', heading: 'Nexo Cloud Status' },
      { nav: 'API Keys', heading: 'API Keys' },
      { nav: 'Reports', heading: 'Reports' },
      { nav: 'Settings', heading: 'Settings' },
    ];

    for (const module of modules) {
      await page.getByRole('button', { name: module.nav }).click();
      await expect(page.getByRole('heading', { name: module.heading })).toBeVisible();
      await expect(page.getByText('Demo Data')).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
    }
  });

  test('global search focus shortcut is available after login', async ({ page }) => {
    await page.goto('/');

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
    await expect(page.getByPlaceholder('Search infrastructure...')).toBeFocused();
  });
});
