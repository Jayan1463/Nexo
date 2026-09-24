import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { initializeApp as adminApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminDb } from 'firebase-admin/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

test('database permissions, private status data, scans, and complete project cleanup', async ({ request }) => {
  test.setTimeout(90_000);
  const id = crypto.randomUUID();
  const app = adminApp({ projectId: 'demo-nexo-e2e' }, id);
  const db = adminDb(app);
  const orgId = `org-${id}`;
  const projectId = `project-${id}`;
  const serverId = `server-${id}`;
  const otherProject = `keep-${id}`;
  const key = `nexo_live_${crypto.randomUUID()}`;
  const password = 'DatabaseTests123!';
  const clients: ReturnType<typeof initializeApp>[] = [];
  async function account(role: string, belongs = true) {
    const email = `${role}-${id}@example.test`;
    const user = await adminAuth(app).createUser({ email, password });
    await db.doc(`users/${user.uid}`).set({ uid: user.uid, email, currentOrgId: orgId });
    if (belongs) await db.doc(`organizations/${orgId}/members/${user.uid}`).set({ uid: user.uid, email, role });
    const client = initializeApp({ projectId: 'demo-nexo-e2e', apiKey: 'e2e' }, `${role}-${id}`);
    clients.push(client);
    const auth = getAuth(client);
    connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true });
    const clientDb = getFirestore(client);
    connectFirestoreEmulator(clientDb, '127.0.0.1', 18080);
    const signed = await signInWithEmailAndPassword(auth, email, password);
    return { uid: user.uid, email, db: clientDb, headers: { Authorization: `Bearer ${await signed.user.getIdToken()}` } };
  }
  try {
    const owner = await account('owner');
    const admin = await account('admin');
    const developer = await account('developer');
    const viewer = await account('viewer');
    const outsider = await account('outsider', false);
    await db.doc(`organizations/${orgId}`).set({ ownerId: owner.uid, name: 'Database test' });
    for (const pid of [projectId, otherProject]) {
      await db.doc(`projects/${pid}`).set({ orgId, lifecycle: 'active' });
      await db.doc(`organizations/${orgId}/projects/${pid}`).set({ id: pid, orgId, name: pid });
    }
    await db.doc(`servers/${serverId}`).set({ id: serverId, projectId, name: 'private-hostname', hostname: '10.0.0.8',
      apiKeyHash: crypto.createHash('sha256').update(key).digest('hex'), apiKeyStatus: 'active', status: 'online',
      publicStatusEnabled: true, publicName: 'Customer API', lastSeen: new Date().toISOString() });
    await db.doc(`projects/${projectId}/incidents/incident`).set({ projectId, serverId, title: 'private-hostname CPU',
      summary: 'internal process information', severity: 'critical', status: 'investigating', publicVisible: true,
      createdAt: new Date().toISOString(), timeline: [{ userId: owner.uid }] });
    await db.doc(`projects/${projectId}/alerts/alert`).set({ projectId, status: 'active' });
    const denied = (promise: Promise<unknown>) => expect(promise).rejects.toMatchObject({ code: 'permission-denied' });
    const server = (client: typeof viewer) => doc(client.db, `servers/${serverId}`);
    for (const client of [owner, admin, developer, viewer]) {
      expect((await getDoc(server(client))).exists()).toBe(true);
      expect((await getDoc(doc(client.db, `projects/${projectId}/alerts/alert`))).exists()).toBe(true);
    }
    const provision = (client: typeof viewer, id: string) => setDoc(doc(client.db, `servers/${id}`), {
      id, projectId, name: id, status: 'offline', apiKeyStatus: 'active', apiKeyHash: 'b'.repeat(64),
    });
    await provision(owner, `owner-${id}`);
    await provision(admin, `admin-${id}`);
    await denied(provision(developer, `developer-${id}`));
    await denied(provision(viewer, `viewer-${id}`));
    await denied(updateDoc(server(viewer), { apiKeyHash: 'a'.repeat(64) }));
    await denied(deleteDoc(server(viewer)));
    await denied(updateDoc(doc(viewer.db, `projects/${projectId}/incidents/incident`), { status: 'resolved' }));
    await denied(setDoc(doc(viewer.db, `servers/${serverId}/metrics/fake`), { cpu: 1 }));
    await denied(updateDoc(server(developer), { apiKeyStatus: 'revoked' }));
    await denied(updateDoc(server(developer), { publicStatusEnabled: false }));
    await denied(setDoc(doc(viewer.db, `projects/${projectId}/alert_rules/default`), { cpuWarning: 70 }));
    await denied(setDoc(doc(viewer.db, `projects/${projectId}/incidents/viewer`), { projectId, status: 'investigating' }));
    await updateDoc(doc(developer.db, `projects/${projectId}/alerts/alert`), { status: 'acknowledged' });
    await setDoc(doc(developer.db, `projects/${projectId}/alert_rules/default`), { cpuWarning: 70, cpuCritical: 95 });
    await setDoc(doc(developer.db, `projects/${projectId}/incidents/developer`), { projectId, status: 'investigating' });
    expect((await db.doc(`projects/${projectId}/alert_rules/default`).get()).data()?.cpuWarning).toBe(70);
    await denied(updateDoc(doc(admin.db, `organizations/${orgId}`), { ownerId: admin.uid }));
    await denied(updateDoc(doc(admin.db, `organizations/${orgId}/members/${admin.uid}`), { role: 'owner' }));
    await denied(deleteDoc(doc(admin.db, `organizations/${orgId}/members/${owner.uid}`)));
    await denied(updateDoc(doc(developer.db, `organizations/${orgId}/members/${viewer.uid}`), { role: 'admin' }));
    await updateDoc(server(admin), { publicName: 'Public API' });
    await updateDoc(server(owner), { publicStatusEnabled: true });
    await denied(getDoc(doc(owner.db, `users/${viewer.uid}`)));
    expect((await getDoc(doc(owner.db, `organizations/${orgId}/members/${viewer.uid}`))).data()?.email).toBe(viewer.email);

    // Invitees cannot promote themselves or reopen an accepted invitation.
    const inviteRef = db.doc(`organizations/${orgId}/invites/test-invite`);
    await inviteRef.set({ email: viewer.email, role: 'viewer', status: 'pending', inviteToken: 'test-token' });
    await denied(updateDoc(doc(viewer.db, inviteRef.path), { role: 'admin' }));
    await denied(updateDoc(doc(viewer.db, inviteRef.path), { status: 'accepted' }));
    expect((await inviteRef.get()).data()?.role).toBe('viewer');

    // Changing profile state or claiming a matching project ID cannot cross tenants.
    await denied(getDoc(server(outsider)));
    const outsideOrg = `outside-${id}`;
    await db.doc(`organizations/${outsideOrg}`).set({ ownerId: outsider.uid });
    await db.doc(`organizations/${outsideOrg}/members/${outsider.uid}`).set({ uid: outsider.uid, role: 'owner' });
    await denied(setDoc(doc(outsider.db, `organizations/${outsideOrg}/projects/${projectId}`), { id: projectId, orgId: outsideOrg }));
    await denied(setDoc(doc(outsider.db, `projects/${projectId}`), { orgId: outsideOrg, lifecycle: 'active' }));
    const newProject = `new-${id}`;
    const batch = writeBatch(owner.db);
    batch.set(doc(owner.db, `projects/${newProject}`), { orgId, lifecycle: 'active' });
    batch.set(doc(owner.db, `organizations/${orgId}/projects/${newProject}`), { id: newProject, orgId, name: 'Atomic project' });
    await batch.commit();
    await denied(deleteDoc(doc(owner.db, `organizations/${orgId}/projects/${newProject}`)));

    const anonymous = initializeApp({ projectId: 'demo-nexo-e2e', apiKey: 'e2e' }, `anonymous-${id}`);
    clients.push(anonymous);
    const anonDb = getFirestore(anonymous);
    connectFirestoreEmulator(anonDb, '127.0.0.1', 18080);
    await denied(getDoc(doc(anonDb, `servers/${serverId}`)));
    await denied(getDoc(doc(anonDb, `projects/${projectId}/incidents/incident`)));
    const publicResponse = await request.get(`/api/public-status?projectId=${projectId}`);
    expect(publicResponse.status()).toBe(200);
    const publicData = await publicResponse.json();
    expect(publicData.servers).toEqual([{ id: serverId, publicName: 'Public API', status: 'online' }]);
    expect(JSON.stringify(publicData)).not.toMatch(/private-hostname|apiKey|10\.0\.0\.8|internal process|timeline|userId/);
    await db.doc(`servers/${serverId}`).update({ lastSeen: new Date(Date.now() - 60_000).toISOString() });
    const staleStatus = await request.get(`/api/public-status?projectId=${projectId}`);
    expect((await staleStatus.json()).servers).toEqual([{ id: serverId, publicName: 'Public API', status: 'offline' }]);

    expect((await request.post('/api/deep-scan', { data: { serverId } })).status()).toBe(401);
    expect((await request.post('/api/deep-scan', { headers: outsider.headers, data: { serverId } })).status()).toBe(403);
    for (let i = 0; i < 3; i++) await db.doc(`servers/${serverId}/metrics/point-${i}`).set({ cpu: 98, memory: 95, network: 3, timestamp: new Date().toISOString() });
    const scan = await request.post('/api/deep-scan', { headers: viewer.headers, data: { serverId } });
    expect(scan.status()).toBe(200);
    const scanData = (await scan.json()).scan;
    expect(scanData.scannedPoints).toBe(3);
    expect((await db.doc(`servers/${serverId}/deep_scans/${scanData.id}`).get()).exists).toBe(true);

    const ingest = await request.post('/api/metrics', { headers: { 'X-Nexo-API-Key': key }, data: { cpu: 20, memory: 30, network: 2 } });
    expect(ingest.status()).toBe(200);
    const deletion = { orgId, projectId };
    expect((await request.post('/api/delete-project', { data: deletion })).status()).toBe(401);
    expect((await request.post('/api/delete-project', { headers: viewer.headers, data: deletion })).status()).toBe(403);
    expect((await request.post('/api/delete-project', { headers: outsider.headers, data: { orgId: outsideOrg, projectId } })).status()).toBe(403);
    // More than a batch of descendants proves recursive cleanup, including nested data.
    const writer = db.bulkWriter();
    for (let i = 0; i < 505; i++) writer.set(db.doc(`projects/${projectId}/logs/log-${i}`), { message: 'test' });
    await writer.close();
    await db.doc(`projects/${projectId}/incidents/incident/comments/nested`).set({ text: 'test' });
    expect((await request.post('/api/delete-project', { headers: owner.headers, data: deletion })).status()).toBe(200);
    expect((await db.doc(`servers/${serverId}`).get()).exists).toBe(false);
    expect((await db.collection(`servers/${serverId}/metrics`).get()).empty).toBe(true);
    expect((await db.collection(`servers/${serverId}/deep_scans`).get()).empty).toBe(true);
    expect((await db.collection(`projects/${projectId}/logs`).get()).empty).toBe(true);
    expect((await db.doc(`projects/${projectId}/incidents/incident/comments/nested`).get()).exists).toBe(false);
    expect((await db.doc(`organizations/${orgId}/projects/${projectId}`).get()).exists).toBe(false);
    expect((await db.doc(`projects/${projectId}`).get()).data()?.lifecycle).toBe('deleted');
    expect((await db.doc(`projects/${otherProject}`).get()).data()?.lifecycle).toBe('active');
    expect((await request.post('/api/delete-project', { headers: owner.headers, data: deletion })).status()).toBe(200);
    expect((await request.post('/api/metrics', { headers: { 'X-Nexo-API-Key': key }, data: { cpu: 20, memory: 30, network: 2 } })).status()).toBe(401);
    expect((await request.get(`/api/public-status?projectId=${projectId}`)).status()).toBe(200);
    expect((await request.post('/api/delete-project', { headers: admin.headers, data: { orgId, projectId: newProject } })).status()).toBe(200);
    expect((await request.post('/api/delete-project', { headers: owner.headers, data: { orgId, projectId: otherProject } })).status()).toBe(409);
  } finally {
    await Promise.all(clients.map(deleteApp));
  }
});
