import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

test('non-owner account deletion removes Firebase Auth and Firestore membership', async ({ request }) => {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Account E2E tests require isolated Firebase emulators.');
  }
  const app = initializeApp({ projectId: 'demo-nexo-e2e' }, `account-${crypto.randomUUID()}`);
  const db = getFirestore(app);
  const unique = crypto.randomUUID().slice(0, 8);
  const email = `delete-${unique}@example.test`;
  const orgId = `delete-org-${unique}`;

  const unauthenticated = await request.post('/api/delete-account');
  expect(unauthenticated.status()).toBe(401);

  const signup = await request.post('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=e2e', {
    data: { email, password: 'E2eTestingPassword123!', returnSecureToken: true },
  });
  expect(signup.status()).toBe(200);
  const { localId: uid, idToken } = await signup.json();
  await db.collection('organizations').doc(orgId).set({ ownerId: 'different-owner', name: 'Deletion Test Org' });
  await db.collection(`organizations/${orgId}/members`).doc(uid).set({ uid, email, role: 'viewer' });
  await db.collection('users').doc(uid).set({ uid, email, currentOrgId: orgId, orgIds: [orgId] });

  const response = await request.post('/api/delete-account', { headers: { Authorization: `Bearer ${idToken}` } });
  expect(response.status()).toBe(200);
  expect((await db.collection('users').doc(uid).get()).exists).toBe(false);
  expect((await db.collection(`organizations/${orgId}/members`).doc(uid).get()).exists).toBe(false);
  await expect(getAuth(app).getUser(uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
});
