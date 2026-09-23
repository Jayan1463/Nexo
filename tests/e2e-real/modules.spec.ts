import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';

test('all owner modules render with a real Firebase account', async ({ page }, testInfo) => {
  const unique = crypto.randomUUID().slice(0, 8);
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.getByPlaceholder('Display name').fill('Modules Owner');
  await page.getByPlaceholder('Email address').fill(`modules-${unique}@example.test`);
  await page.getByPlaceholder('Password', { exact: true }).fill('E2eTestingPassword123!');
  await page.getByPlaceholder('Confirm password').fill('E2eTestingPassword123!');
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();

  const modules = [
    ['Servers', 'Connected Nodes'],
    ['Analytics', 'System Analytics'],
    ['Logs', 'Log Explorer'],
    ['Alerts', 'Alert Management'],
    ['Incidents', 'Incidents'],
    ['Cost Intelligence', 'Cost Intelligence'],
    ['Risk Analysis', 'Risk Analysis'],
    ['Status Page', 'Nexo Cloud Status'],
    ['Team', 'Team'],
    ['API Keys', 'API Keys'],
    ['Audit Logs', 'Audit Logs'],
    ['Reports', 'Operational Reports'],
    ['Help & Docs', 'Help & Docs'],
    ['Settings', 'Settings'],
    ['Dashboard', 'System Overview'],
  ] as const;

  for (const [nav, heading] of modules) {
    if (testInfo.project.name.includes('mobile')) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
    }
    await page.getByRole('button', { name: nav, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.getByText('This module hit an error.')).toHaveCount(0);
  }
});
