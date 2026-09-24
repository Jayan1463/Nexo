import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';

export function database() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const account = raw ? JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw) : null;
    if (account?.private_key) account.private_key = account.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'nexocloud-software',
      ...(account ? { credential: admin.credential.cert(account) } : {}),
    });
  }
  return getFirestore(admin.app(), process.env.FIREBASE_DATABASE_ID || '(default)');
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function endpoint(method: string, action: (req: any, db: FirebaseFirestore.Firestore) => Promise<unknown>) {
  return async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== method) return res.status(405).json({ error: 'Method not allowed' });
    try {
      return res.status(200).json(await action(req, database()));
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      console.error('Database operation failed', error);
      return res.status(500).json({ error: 'Database operation failed. Please retry.' });
    }
  };
}

export function documentId(value: unknown): string {
  if (typeof value !== 'string' || !value || value.includes('/') || value.length > 128) {
    throw new HttpError(400, 'A valid document ID is required');
  }
  return value;
}

export async function identity(req: any) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required');
  try { return await admin.auth().verifyIdToken(header.slice(7)); }
  catch { throw new HttpError(401, 'Invalid token'); }
}

export async function orgRole(db: FirebaseFirestore.Firestore, uid: string, orgId: string) {
  const org = await db.doc(`organizations/${orgId}`).get();
  if (!org.exists) throw new HttpError(404, 'Organization not found');
  if (org.data()?.ownerId === uid) return 'owner';
  const member = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  const role = member.data()?.role;
  if (!['admin', 'developer', 'viewer'].includes(role)) throw new HttpError(403, 'Organization access denied');
  return role as string;
}

// All ingestion writes recheck the project and server in the same transaction.
// Marking a project as deleting prevents late writes from recreating its data.
export async function activeServerWrite(
  db: FirebaseFirestore.Firestore,
  serverId: string,
  write: (tx: FirebaseFirestore.Transaction) => void,
) {
  await db.runTransaction(async (tx) => {
    const server = await tx.get(db.doc(`servers/${serverId}`));
    if (!server.exists || server.data()?.deletedAt || server.data()?.apiKeyStatus === 'revoked') {
      throw new HttpError(401, 'Server key is inactive');
    }
    const project = await tx.get(db.doc(`projects/${server.data()!.projectId}`));
    if (!project.exists || project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
    write(tx);
  });
}
