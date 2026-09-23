import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const execFileAsync = promisify(execFile);

test('real signup, agent, telemetry, logs, public status, alerts, incidents, and key lifecycle', async ({ page, request, browser }, testInfo) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Real E2E tests require the isolated Firebase emulators. Run npm run test:e2e:real.');
  }
  const adminApp = initializeApp({ projectId: 'demo-nexo-e2e' }, `e2e-${crypto.randomUUID()}`);
  const db = getFirestore(adminApp);
  const unique = crypto.randomUUID().slice(0, 8);
  const serverName = `e2e-node-${unique}`;
  const logMessage = `e2e-log-${unique}`;
  const email = `e2e-${unique}@example.test`;
  const password = 'E2eTestingPassword123!';
  const openModule = async (name: string) => {
    if (testInfo.project.name.includes('mobile')) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
    }
    await page.getByRole('button', { name, exact: true }).click();
  };

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.getByPlaceholder('Display name').fill('E2E Owner');
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByPlaceholder('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();

  await openModule('Servers');
  await expect(page.getByRole('heading', { name: 'Connected Nodes' })).toBeVisible();
  await page.getByRole('button', { name: 'Provision Node' }).click();
  await page.getByPlaceholder('e.g. production-api-01').fill(serverName);
  await page.getByRole('button', { name: 'Generate Provisioning Key' }).click();
  await expect(page.getByRole('heading', { name: 'Provisioning Ready' })).toBeVisible();
  const apiKey = (await page.locator('code').filter({ hasText: /^nexo_live_/ }).first().textContent())?.trim();
  expect(apiKey).toMatch(/^nexo_live_[a-f0-9]+$/);
  const serverId = (await page.locator('code').filter({ hasText: /^[a-f0-9-]{36}$/ }).first().textContent())?.trim();
  expect(serverId).toMatch(/^[a-f0-9-]{36}$/);
  await page.getByRole('button', { name: 'Complete Provisioning' }).click();
  await expect(page.getByText(serverName, { exact: true }).last()).toBeVisible();

  await execFileAsync('node', ['src/agent.js'], {
    cwd: path.join(process.cwd(), 'monitoring-agent'),
    env: {
      ...process.env,
      NEXO_RUN_ONCE: 'true',
      NEXO_STATE_DIR: path.join(os.tmpdir(), `nexo-e2e-agent-${unique}`),
      NEXO_API_URL: 'http://127.0.0.1:3000/api/v1/telemetry',
      NEXO_SERVER_ID: serverId!,
      NEXO_API_KEY: apiKey!,
    },
    timeout: 30_000,
  });
  await expect.poll(async () => (await db.collection('servers').doc(serverId!).collection('metrics').limit(1).get()).size).toBe(1);
  const serverData = (await db.collection('servers').doc(serverId!).get()).data();
  expect(serverData?.lastSeen).toBeTruthy();
  const projectId = String(serverData?.projectId || '');
  expect(projectId).not.toBe('');

  await page.getByText(serverName, { exact: true }).click();
  await page.getByRole('button', { name: `Toggle public status for ${serverName}` }).click();
  await page.getByRole('button', { name: 'Close server details' }).click();

  const headers = { 'X-Nexo-API-Key': apiKey! };
  const invalid = await request.post('/api/v1/telemetry', {
    headers,
    data: { cpu: 101, memory: 24, disk: 30, network: 2 },
  });
  expect(invalid.status()).toBe(400);
  const wrongKey = await request.post('/api/v1/telemetry', {
    headers: { 'X-Nexo-API-Key': 'nexo_live_invalid' },
    data: { cpu: 12, memory: 24, disk: 30, network: 2 },
  });
  expect(wrongKey.status()).toBe(401);
  const normal = await request.post('/api/v1/telemetry', {
    headers,
    data: { cpu: 12, memory: 24, disk: 30, network: 2, timestamp: new Date().toISOString() },
  });
  expect(normal.status()).toBe(200);
  expect(await normal.json()).toEqual(expect.objectContaining({ success: true }));

  const log = await request.post('/api/v1/logs', {
    headers,
    data: { level: 'error', service: 'e2e-agent', message: logMessage },
  });
  expect(log.status()).toBe(200);

  const critical = await request.post('/api/v1/telemetry', {
    headers,
    data: { cpu: 97, memory: 24, disk: 30, network: 2, timestamp: new Date().toISOString() },
  });
  expect(critical.status()).toBe(200);

  await openModule('Logs');
  await expect(page.getByText(logMessage)).toBeVisible();
  await openModule('Alerts');
  await expect(page.getByText(`High CPU detected on ${serverName}: 97.0%`)).toBeVisible();
  await openModule('Incidents');
  await expect(page.getByRole('heading', { name: `High CPU detected on ${serverName}: 97.0%` })).toBeVisible();

  const publicPage = await browser.newPage();
  await publicPage.goto(`/status?projectId=${projectId}`);
  await expect(publicPage.getByRole('heading', { name: 'Nexo Cloud Status' })).toBeVisible();
  await expect(publicPage.getByText(serverName, { exact: true })).toBeVisible();
  await expect(publicPage.getByText('Major Outage')).toBeVisible();
  await publicPage.close();

  await openModule('Reports');
  await expect(page.getByRole('heading', { name: 'Operational Reports' })).toBeVisible();
  await expect(page.getByText(`Nexo Cloud observed 1 servers, 1 alerts,`)).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  const download = await downloadPromise;
  const reportText = await fs.readFile(await download.path(), 'utf8');
  expect(reportText).toContain('Servers,1');
  expect(reportText).toContain('Critical Alerts,1');
  expect(reportText).toContain('Open Incidents,1');

  await openModule('Alerts');
  await page.getByRole('button', { name: 'Acknowledge' }).click();
  const alertsRef = db.collection(`projects/${projectId}/alerts`);
  await expect.poll(async () => (await alertsRef.where('serverId', '==', serverId).limit(1).get()).docs[0]?.data().status).toBe('acknowledged');
  await page.getByRole('button', { name: 'Resolve', exact: true }).click();
  await expect.poll(async () => (await alertsRef.where('serverId', '==', serverId).limit(1).get()).docs[0]?.data().status).toBe('resolved');

  await openModule('Incidents');
  const incidentCard = page.locator('article').filter({ has: page.getByRole('heading', { name: `High CPU detected on ${serverName}: 97.0%` }) });
  await incidentCard.getByRole('button', { name: 'resolved', exact: true }).click();
  await expect.poll(async () => (await db.collection(`projects/${projectId}/incidents`).where('serverId', '==', serverId).limit(1).get()).docs[0]?.data().status).toBe('resolved');

  const recoveredPage = await browser.newPage();
  await recoveredPage.goto(`/status?projectId=${projectId}`);
  await expect(recoveredPage.getByText('Degraded Performance')).toBeVisible();
  await recoveredPage.close();

  await openModule('API Keys');
  await page.getByRole('button', { name: `Revoke key for ${serverName}` }).click();
  await expect(page.getByText('revoked', { exact: true })).toBeVisible();
  const rejected = await request.post('/api/v1/telemetry', {
    headers,
    data: { cpu: 12, memory: 24, disk: 30, network: 2 },
  });
  expect(rejected.status()).toBe(401);

  await page.getByRole('button', { name: 'Generate Key' }).click();
  const replacementKey = (await page.getByText('Copy this key now. It will not be shown again.').locator('..').locator('button').locator('span').textContent())?.trim();
  expect(replacementKey).toMatch(/^nexo_live_[a-f0-9]+$/);
  expect(replacementKey).not.toBe(apiKey);
  const acceptedAgain = await request.post('/api/v1/telemetry', {
    headers: { 'X-Nexo-API-Key': replacementKey! },
    data: { cpu: 12, memory: 24, disk: 30, network: 2 },
  });
  expect(acceptedAgain.status()).toBe(200);

  if (testInfo.project.name.includes('mobile')) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await page.getByRole('button', { name: 'Sign Out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login with Email' }).click();
  await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
  await expect(page.getByText(serverName, { exact: true }).last()).toBeVisible();

  await openModule('Servers');
  await expect(page.getByRole('heading', { name: 'Connected Nodes' })).toBeVisible();
  await page.getByText(serverName, { exact: true }).click();
  await page.getByRole('button', { name: 'Terminate Node' }).click();
  await page.getByRole('button', { name: 'Confirm', exact: true }).click();
  await expect(page.getByText('No nodes detected')).toBeVisible();
  const deletedServer = (await db.collection('servers').doc(serverId!).get()).data();
  expect(deletedServer?.deletedAt).toBeTruthy();
  expect(deletedServer?.apiKeyStatus).toBe('revoked');
  const deletedKeyResponse = await request.post('/api/v1/telemetry', {
    headers: { 'X-Nexo-API-Key': replacementKey! },
    data: { cpu: 12, memory: 24, disk: 30, network: 2 },
  });
  expect(deletedKeyResponse.status()).toBe(401);
});
