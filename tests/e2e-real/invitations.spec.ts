import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp as initializeClientApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore as getClientFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

test('owner invites a viewer, viewer accepts, and invitation authorization is enforced', async ({ page, request, browser }, testInfo) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Invitation E2E tests require isolated Firebase emulators.');
  }
  const db = getFirestore(initializeApp({ projectId: 'demo-nexo-e2e' }, `invite-${crypto.randomUUID()}`));
  const unique = crypto.randomUUID().slice(0, 8);
  const ownerEmail = `owner-${unique}@example.test`;
  const viewerEmail = `viewer-${unique}@example.test`;
  const password = 'E2eTestingPassword123!';

  const noAuth = await request.post('/api/invite', {
    data: { orgId: 'missing', email: viewerEmail, role: 'admin' },
  });
  expect(noAuth.status()).toBe(401);

  await page.goto('/');
  await page.getByRole('button', { name: 'Sign Up' }).click();
  await page.getByPlaceholder('Display name').fill('Invite Owner');
  await page.getByPlaceholder('Email address').fill(ownerEmail);
  await page.getByPlaceholder('Password', { exact: true }).fill(password);
  await page.getByPlaceholder('Confirm password').fill(password);
  await page.getByRole('button', { name: 'Create Account' }).click();
  await expect(page.getByRole('heading', { name: 'System Overview' })).toBeVisible();

  if (testInfo.project.name.includes('mobile')) {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
  }
  await page.getByRole('button', { name: 'Team', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Team' })).toBeVisible();
  await page.getByPlaceholder('teammate@example.com').fill(viewerEmail);
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  await expect(page.getByText('Invitation created and queued for email delivery.')).toBeVisible();

  const ownerDoc = (await db.collection('users').where('email', '==', ownerEmail).limit(1).get()).docs[0];
  expect(ownerDoc).toBeTruthy();
  const orgId = String(ownerDoc.data().currentOrgId);
  const inviteSnap = await db.collection(`organizations/${orgId}/invites`).where('email', '==', viewerEmail).limit(1).get();
  expect(inviteSnap.empty).toBe(false);
  const invite = inviteSnap.docs[0].data();
  const invitationPath = new URL(String(invite.inviteLink));

  const viewerPage = await browser.newPage();
  viewerPage.on('dialog', (dialog) => void dialog.accept());
  await viewerPage.goto(`${invitationPath.pathname}${invitationPath.search}`);
  await viewerPage.getByRole('button', { name: 'Sign Up' }).click();
  await viewerPage.getByPlaceholder('Display name').fill('Invite Viewer');
  await viewerPage.getByPlaceholder('Email address').fill(viewerEmail);
  await viewerPage.getByPlaceholder('Password', { exact: true }).fill(password);
  await viewerPage.getByPlaceholder('Confirm password').fill(password);
  await viewerPage.getByRole('button', { name: 'Create Account' }).click();
  await expect(viewerPage.getByRole('heading', { name: 'System Overview' })).toBeVisible();
  await expect.poll(async () => (await inviteSnap.docs[0].ref.get()).data()?.status).toBe('accepted');
  await expect(viewerPage.getByRole('button', { name: 'API Keys' })).toHaveCount(0);
  await expect(viewerPage.getByRole('button', { name: 'Team', exact: true })).toHaveCount(0);

  const viewerDoc = (await db.collection('users').where('email', '==', viewerEmail).limit(1).get()).docs[0];
  expect(viewerDoc.data().currentOrgId).toBe(orgId);
  const member = await db.collection(`organizations/${orgId}/members`).doc(viewerDoc.id).get();
  expect(member.data()?.role).toBe('viewer');

  const authResponse = await request.post('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=e2e', {
    data: { email: viewerEmail, password, returnSecureToken: true },
  });
  expect(authResponse.status()).toBe(200);
  const viewerToken = String((await authResponse.json()).idToken);
  const forbiddenInvite = await request.post('/api/invite', {
    headers: { Authorization: `Bearer ${viewerToken}` },
    data: { orgId, email: `other-${unique}@example.test`, role: 'admin' },
  });
  expect(forbiddenInvite.status()).toBe(403);

  const unrelatedOrgId = `unrelated-${unique}`;
  const unrelatedProjectId = `unrelated-project-${unique}`;
  await db.collection('organizations').doc(unrelatedOrgId).set({ ownerId: `someone-else-${unique}`, name: 'Unrelated' });
  await db.collection(`organizations/${unrelatedOrgId}/projects`).doc(unrelatedProjectId).set({ id: unrelatedProjectId, orgId: unrelatedOrgId });
  await db.collection(`projects/${unrelatedProjectId}/alerts`).doc('private-alert').set({ projectId: unrelatedProjectId, severity: 'critical', message: 'private', timestamp: new Date().toISOString() });

  const clientApp = initializeClientApp({ apiKey: 'e2e', authDomain: 'demo-nexo-e2e.firebaseapp.com', projectId: 'demo-nexo-e2e' }, `rules-${unique}`);
  const clientAuth = getAuth(clientApp);
  connectAuthEmulator(clientAuth, 'http://127.0.0.1:19099', { disableWarnings: true });
  const clientDb = getClientFirestore(clientApp);
  connectFirestoreEmulator(clientDb, '127.0.0.1', 18080);
  await signInWithEmailAndPassword(clientAuth, viewerEmail, password);
  await expect(setDoc(doc(clientDb, `organizations/${unrelatedOrgId}/members`, viewerDoc.id), {
    uid: viewerDoc.id, role: 'owner',
  })).rejects.toMatchObject({ code: 'permission-denied' });
  await updateDoc(doc(clientDb, 'users', viewerDoc.id), { currentOrgId: unrelatedOrgId });
  await expect(getDoc(doc(clientDb, `projects/${unrelatedProjectId}/alerts`, 'private-alert'))).rejects.toMatchObject({ code: 'permission-denied' });
  await deleteApp(clientApp);

  const deleteViewer = await request.post('/api/delete-account', {
    headers: { Authorization: `Bearer ${viewerToken}` },
  });
  expect(deleteViewer.status()).toBe(409);
  expect((await db.collection('users').doc(viewerDoc.id).get()).exists).toBe(true);
  await viewerPage.close();
});
