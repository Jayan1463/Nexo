import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migrateProjectBindings } from '../../backend/project-migration';

test('ownership migration is read-only by default, repeatable, and refuses conflicting IDs', async () => {
  const id = crypto.randomUUID();
  // An isolated emulator database prevents migration inspection from racing with
  // the other tests' workspace provisioning.
  const db = getFirestore(initializeApp({ projectId: 'demo-nexo-e2e' }, id), `migration-${id}`);
  await db.doc('organizations/a').set({ ownerId: 'a' });
  await db.doc('organizations/a/projects/p').set({ id: 'p', orgId: 'a' });
  await db.doc('projects/p/logs/retained').set({ message: 'preserve telemetry' });
  expect(await migrateProjectBindings(db)).toEqual({ inspected: 1, missing: 1, applied: 0 });
  expect((await db.doc('projects/p').get()).exists).toBe(false);
  expect(await migrateProjectBindings(db, true)).toEqual({ inspected: 1, missing: 1, applied: 1 });
  expect(await migrateProjectBindings(db, true)).toEqual({ inspected: 1, missing: 0, applied: 0 });
  expect((await db.doc('projects/p/logs/retained').get()).data()?.message).toBe('preserve telemetry');
  await db.doc('organizations/b').set({ ownerId: 'b' });
  await db.doc('organizations/b/projects/p').set({ id: 'p', orgId: 'b' });
  await expect(migrateProjectBindings(db, true)).rejects.toThrow('Duplicate project ID');
  expect((await db.doc('projects/p').get()).data()?.orgId).toBe('a');
});
