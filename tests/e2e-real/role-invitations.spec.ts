import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

test('owner invites admin, admin invites developer, and developer cannot invite', async ({ page, browser, request }, testInfo) => {
  const id = crypto.randomUUID().slice(0, 8);
  const password = 'InvitedRoles123!';
  const ownerEmail = `owner-${id}@example.test`;
  const adminEmail = `admin-${id}@example.test`;
  const developerEmail = `developer-${id}@example.test`;
  const viewerEmail = `viewer-${id}@example.test`;
  const db = getFirestore(initializeApp({ projectId: 'demo-nexo-e2e' }, `role-invites-${id}`));
  const mobile = testInfo.project.name.includes('mobile');

  async function invite(inviter: typeof page, email: string, role: 'admin' | 'developer') {
    if (mobile) await inviter.getByRole('button', { name: 'Open navigation menu' }).click();
    await inviter.getByRole('button', { name: 'Team', exact: true }).click();
    await inviter.getByPlaceholder('teammate@example.com').fill(email);
    await inviter.getByPlaceholder('teammate@example.com').locator('..').locator('select').selectOption(role);
    await inviter.getByRole('button', { name: 'Invite', exact: true }).click();
    await expect(inviter.getByText('Invitation created. Email was not delivered; share this link with the invitee.')).toBeVisible();
    return inviter.getByRole('textbox', { name: 'Invitation link' }).inputValue();
  }

  async function accept(link: string, email: string) {
    const invited = await browser.newPage();
    const url = new URL(link);
    await invited.goto(`${url.pathname}${url.search}`);
    await invited.getByRole('button', { name: 'Sign Up' }).click();
    await invited.getByPlaceholder('Display name').fill(email.split('@')[0]);
    await invited.getByPlaceholder('Email address').fill(email);
    await invited.getByPlaceholder('Password', { exact: true }).fill(password);
    await invited.getByPlaceholder('Confirm password').fill(password);
    await invited.getByRole('button', { name: 'Create Account' }).click();
    await expect(invited.getByRole('heading', { name: 'Verify email to accept invitation' })).toBeVisible();
    await invited.getByRole('button', { name: 'Send verification email' }).click();
    const codes = await request.get('http://127.0.0.1:19099/emulator/v1/projects/demo-nexo-e2e/oobCodes');
    const code = (await codes.json()).oobCodes.find((entry: any) => entry.email === email && entry.requestType === 'VERIFY_EMAIL');
    expect(code).toBeTruthy();
    const verified = await request.post('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:update?key=e2e', { data: { oobCode: code.oobCode } });
    expect(verified.status()).toBe(200);
    await invited.getByRole('button', { name: 'I verified my email' }).click();
    await expect(invited.getByRole('heading', { name: 'System Overview' })).toBeVisible();
    return invited;
  }

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.getByPlaceholder('Display name').fill('Owner');
  await page.getByPlaceholder('Email address').fill(ownerEmail);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByPlaceholder('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();
  const owner = (await db.collection('users').where('email', '==', ownerEmail).limit(1).get()).docs[0];
  const orgId = String(owner.data().currentOrgId);

  const admin = await accept(await invite(page, adminEmail, 'admin'), adminEmail);
  const adminUser = (await db.collection('users').where('email', '==', adminEmail).limit(1).get()).docs[0];
  await expect.poll(async () => (await db.doc(`organizations/${orgId}/members/${adminUser.id}`).get()).data()?.role).toBe('admin');
  if (mobile) await admin.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(admin.getByRole('button', { name: 'Team', exact: true })).toBeVisible();
  await expect(admin.getByRole('button', { name: 'API Keys', exact: true })).toBeVisible();
  if (mobile) await admin.getByRole('button', { name: 'Close navigation menu' }).click();

  const developer = await accept(await invite(admin, developerEmail, 'developer'), developerEmail);
  const developerUser = (await db.collection('users').where('email', '==', developerEmail).limit(1).get()).docs[0];
  await expect.poll(async () => (await db.doc(`organizations/${orgId}/members/${developerUser.id}`).get()).data()?.role).toBe('developer');
  if (mobile) await developer.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(developer.getByRole('button', { name: 'Alerts', exact: true })).toBeVisible();
  await expect(developer.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);

  const authResponse = await request.post('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e', {
    data: { email: developerEmail, password, returnSecureToken: true },
  });
  expect(authResponse.status()).toBe(200);
  const developerToken = String((await authResponse.json()).idToken);
  const denied = await request.post('/api/invite', {
    headers: { Authorization: `Bearer ${developerToken}` },
    data: { orgId, email: `other-${id}@example.test`, role: 'admin' },
  });
  expect(denied.status()).toBe(403);
  if (mobile) await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Organization', exact: true }).click();
  await page.getByPlaceholder('member@company.com').fill(viewerEmail);
  await page.getByRole('button', { name: 'Send Invites' }).click();
  const viewerLink = await page.getByRole('textbox', { name: `Invitation link for ${viewerEmail}` }).inputValue();
  const viewer = await accept(viewerLink, viewerEmail);
  const viewerUser = (await db.collection('users').where('email', '==', viewerEmail).limit(1).get()).docs[0];
  await expect.poll(async () => (await db.doc(`organizations/${orgId}/members/${viewerUser.id}`).get()).data()?.role).toBe('viewer');
  if (mobile) await viewer.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(viewer.getByRole('button', { name: 'Servers', exact: true })).toBeVisible();
  await expect(viewer.getByRole('button', { name: 'Alerts', exact: true })).toHaveCount(0);
  await expect(viewer.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);
  // Exercise the separate deployed API handler with the same Firebase Auth token.
  process.env.FIREBASE_PROJECT_ID = 'demo-nexo-e2e';
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = 'emulator-credentials';
  process.env.RESEND_API_KEY = '';
  const adminSdk = (await import('firebase-admin')).default;
  if (!adminSdk.apps.some((firebaseApp) => firebaseApp?.name === '[DEFAULT]')) adminSdk.initializeApp({ projectId: 'demo-nexo-e2e' });
  const { default: deployedInvite } = await import('../../api/invite');
  const adminAuthResponse = await request.post('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e', {
    data: { email: adminEmail, password, returnSecureToken: true },
  });
  const adminToken = String((await adminAuthResponse.json()).idToken);
  let deployedStatus = 0;
  let deployedBody: any;
  const response = {
    status(code: number) { deployedStatus = code; return this; },
    json(body: unknown) { deployedBody = body; return this; },
  };
  await deployedInvite({ method: 'POST', headers: { authorization: `Bearer ${adminToken}`, host: 'example.test' },
    body: { orgId, email: `deployed-${id}@example.test`, role: 'viewer' } }, response);
  expect(deployedStatus).toBe(200);
  expect(deployedBody.inviteLink).toContain('/accept-invite?');
  expect((await db.doc(`organizations/${orgId}/invites/${deployedBody.inviteId}`).get()).data()?.role).toBe('viewer');
  await viewer.close();
  await admin.close();
  await developer.close();
});
