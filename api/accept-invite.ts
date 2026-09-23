import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';

const projectId = process.env.FIREBASE_PROJECT_ID || 'nexocloud-software';
const databaseId = process.env.FIREBASE_DATABASE_ID || '(default)';

if (!admin.apps.length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  let credential: admin.credential.Credential | undefined;
  if (raw) {
    const value = existsSync(raw) ? readFileSync(raw, 'utf8') : raw;
    const account = JSON.parse(value);
    if (typeof account.private_key === 'string') account.private_key = account.private_key.replace(/\\n/g, '\n');
    credential = admin.credential.cert(account);
  }
  admin.initializeApp({ credential, projectId });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const authHeader = String(req.headers.authorization || '');
  if (!authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(authHeader.slice(7).trim());
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const { orgId, inviteId, token } = req.body || {};
  if (![orgId, inviteId, token].every((value) => typeof value === 'string' && value.length > 0)) {
    return res.status(400).json({ error: 'orgId, inviteId, and token are required' });
  }
  try {
    const db = getFirestore(admin.app(), databaseId);
    const orgRef = db.collection('organizations').doc(orgId);
    const orgSnap = await orgRef.get();
    if (!orgSnap.exists) return res.status(404).json({ error: 'Organization not found' });
    const projectSnap = await orgRef.collection('projects').limit(1).get();
    if (projectSnap.empty) return res.status(409).json({ error: 'Organization has no project' });
    const inviteRef = orgRef.collection('invites').doc(inviteId);
    const memberRef = orgRef.collection('members').doc(decoded.uid);
    const userRef = db.collection('users').doc(decoded.uid);
    const email = String(decoded.email || '').trim().toLowerCase();
    await db.runTransaction(async (transaction) => {
      const inviteSnap = await transaction.get(inviteRef);
      const invite = inviteSnap.data();
      if (!inviteSnap.exists || invite?.status !== 'pending' || invite?.inviteToken !== token ||
          String(invite?.email || '').toLowerCase() !== email) {
        throw new Error('INVITE_INVALID');
      }
      const role = ['admin', 'developer', 'viewer'].includes(invite.role) ? invite.role : 'viewer';
      transaction.set(memberRef, {
        uid: decoded.uid,
        email,
        displayName: String(decoded.name || ''),
        role,
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.set(userRef, {
        currentOrgId: orgId,
        orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.update(inviteRef, {
        status: 'accepted',
        acceptedBy: decoded.uid,
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        inviteToken: admin.firestore.FieldValue.delete(),
      });
    });
    return res.status(200).json({ success: true, orgId, projectId: projectSnap.docs[0].id });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_INVALID') {
      return res.status(409).json({ error: 'Invite is invalid, expired, or for another account' });
    }
    console.error('Accept invite failed', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
