import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const screenshotDir = path.resolve(process.cwd(), 'screenshots', 'tabs');

const tabs = [
  { id: 'dashboard', name: 'dashboard', heading: 'System Overview' },
  { id: 'servers', name: 'servers', heading: 'Connected Nodes' },
  { id: 'analytics', name: 'analytics', heading: 'System Analytics' },
  { id: 'logs', name: 'logs', heading: 'Log Explorer' },
  { id: 'alerts', name: 'alerts', heading: 'Alert Management' },
  { id: 'incidents', name: 'incidents', heading: 'Incidents' },
  { id: 'cost', name: 'cost-intelligence', heading: 'Cost Intelligence' },
  { id: 'risk', name: 'risk-analysis', heading: 'Risk Analysis' },
  { id: 'status', name: 'status-page', heading: 'Nexo Cloud Status' },
  { id: 'team', name: 'team', heading: 'Team' },
  { id: 'apiKeys', name: 'api-keys', heading: 'API Keys' },
  { id: 'audit', name: 'audit-logs', heading: 'Audit Logs' },
  { id: 'reports', name: 'reports', heading: 'Operational Reports' },
  { id: 'help', name: 'help-and-docs', heading: 'Help & Docs' },
  { id: 'settings', name: 'settings', heading: 'Settings' },
] as const;

test.describe('owner tab screenshots', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('nexo:e2e-auth', 'owner');
    });
  });

  for (const tab of tabs) {
    test(`captures ${tab.name}`, async ({ page }) => {
      mkdirSync(screenshotDir, { recursive: true });

      await page.goto(`/?tab=${tab.id}`);
      await expect(page.getByRole('heading', { name: tab.heading, exact: true }).first()).toBeVisible();
      await expect(page.getByText('This module hit an error.')).toHaveCount(0);
      await page.screenshot({
        path: path.join(screenshotDir, `${tab.name}.png`),
        fullPage: true,
      });
    });
  }
});
