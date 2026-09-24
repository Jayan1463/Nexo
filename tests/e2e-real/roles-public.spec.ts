import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

test('owner, admin, developer, viewer, and anonymous public status use their intended access', async ({ browser, request }, testInfo) => {
  const id = crypto.randomUUID();
  const app = initializeApp({ projectId: 'demo-nexo-e2e' }, `roles-${id}`);
  const db = getFirestore(app);
  const orgId = `org-${id}`;
  const projectId = `project-${id}`;
  const serverId = `server-${id}`;
  const password = 'RolesTest123!';
  const users: Array<{ role: 'owner' | 'admin' | 'developer' | 'viewer'; uid: string; email: string }> = [];

  for (const role of ['owner', 'admin', 'developer', 'viewer'] as const) {
    const email = `${role}-${id}@example.test`;
    const user = await getAuth(app).createUser({ email, password, emailVerified: true });
    users.push({ role, uid: user.uid, email });
    await db.doc(`users/${user.uid}`).set({ uid: user.uid, email, currentOrgId: orgId, orgIds: [orgId] });
    await db.doc(`organizations/${orgId}/members/${user.uid}`).set({ uid: user.uid, email, role });
  }
  await db.doc(`organizations/${orgId}`).set({ id: orgId, ownerId: users[0].uid, name: 'Role Test', plan: 'free', inviteCode: 'ROLETEST' });
  await db.doc(`projects/${projectId}`).set({ orgId, lifecycle: 'active' });
  await db.doc(`organizations/${orgId}/projects/${projectId}`).set({ id: projectId, orgId, name: 'Role Project', environment: 'prod' });
  await db.doc(`servers/${serverId}`).set({ id: serverId, projectId, name: 'private-host', hostname: '10.0.0.8',
    apiKeyHash: 'a'.repeat(64), apiKeyStatus: 'active', status: 'online', lastSeen: new Date().toISOString(),
    publicStatusEnabled: true, publicName: 'Public API' });

  for (const { role, email } of users) {
    const page = await browser.newPage();
    await page.goto('/');
    await page.getByPlaceholder('Email address').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Login with Email' }).click();
    await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();
    if (testInfo.project.name.includes('mobile')) await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('button', { name: 'Servers', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Alerts', exact: true })).toHaveCount(role === 'viewer' ? 0 : 1);
    await expect(page.getByRole('button', { name: 'Team', exact: true })).toHaveCount(role === 'owner' || role === 'admin' ? 1 : 0);
    await expect(page.getByRole('button', { name: 'API Keys', exact: true })).toHaveCount(role === 'owner' || role === 'admin' ? 1 : 0);
    if (role === 'viewer' || role === 'developer') {
      await page.getByRole('button', { name: 'Servers', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Provision Node' })).toBeDisabled();
    }
    if (role === 'developer') {
      if (testInfo.project.name.includes('mobile')) await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('button', { name: 'Alerts', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Alert Management' })).toBeVisible();
    }

    if (role === 'admin') {
      await page.getByRole('button', { name: 'Team', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Team', exact: true })).toBeVisible();
      if (testInfo.project.name.includes('mobile')) await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await db.doc(`organizations/${orgId}/members/${users[1].uid}`).update({ role: 'viewer' });
      await expect(page.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Alerts', exact: true })).toHaveCount(0);
      await db.doc(`organizations/${orgId}/members/${users[1].uid}`).update({ role: 'admin' });
      await expect(page.getByRole('button', { name: 'Team', exact: true })).toHaveCount(1);
    }
    if (role === 'viewer') {
      await db.doc(`organizations/${orgId}/members/${users[3].uid}`).delete();
      await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    }
    await page.close();
  }

  const publicPage = await browser.newPage();
  await db.doc(`servers/${serverId}`).update({ lastSeen: new Date().toISOString() });
  await publicPage.goto(`/status?projectId=${projectId}`);
  await expect(publicPage.getByText('Public API')).toBeVisible();
  await expect(publicPage.getByText('All Systems Operational')).toBeVisible();
  await expect(publicPage.getByText('private-host')).toHaveCount(0);
  await db.doc(`servers/${serverId}`).update({ lastSeen: new Date(Date.now() - 60_000).toISOString() });
  await expect(publicPage.locator('section').first().getByText('Major Outage')).toBeVisible();
  const response = await request.get(`/api/public-status?projectId=${projectId}`);
  expect((await response.json()).servers).toEqual([{ id: serverId, publicName: 'Public API', status: 'offline' }]);
  await db.doc(`servers/${serverId}`).update({ publicStatusEnabled: false });
  await expect(publicPage.locator('section').first().getByText('No Public Services Configured')).toBeVisible();
  await publicPage.close();
});
