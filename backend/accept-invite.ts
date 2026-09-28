import admin from 'firebase-admin';
import { documentId, endpoint, HttpError, identity } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  if (!user.email_verified) throw new HttpError(403, 'Verify your email before accepting an invitation');
  const orgId = documentId(req.body?.orgId);
  const inviteId = documentId(req.body?.inviteId);
  const token = req.body?.token;
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'Invitation token is required');
  const orgRef = db.doc(`organizations/${orgId}`);
  const projects = await orgRef.collection('projects').get();
  let projectId = '';
  for (const project of projects.docs) {
    const binding = await db.doc(`projects/${project.id}`).get();
    if (binding.data()?.orgId === orgId && binding.data()?.lifecycle === 'active') { projectId = project.id; break; }
  }
  if (!projectId) throw new HttpError(409, 'Organization has no active project');
  const inviteRef = orgRef.collection('invites').doc(inviteId);
  const memberRef = orgRef.collection('members').doc(user.uid);
  let acceptedRole = 'viewer';
  await db.runTransaction(async (tx) => {
    const [org, invite, member, project] = await Promise.all([
      tx.get(orgRef), tx.get(inviteRef), tx.get(memberRef), tx.get(db.doc(`projects/${projectId}`)),
    ]);
    const data = invite.data();
    const createdAt = data?.createdAt?.toMillis?.() ?? Date.parse(data?.createdAt || '');
    if (!org.exists) throw new HttpError(404, 'Organization was not found');
    if (data?.status !== 'pending') throw new HttpError(409, 'Invitation has already been used or cancelled');
    if (data?.inviteToken !== token) throw new HttpError(409, 'Invitation link is invalid. Please ask for a new invitation');
    const inviteEmail = String(data?.email || '').toLowerCase();
    const signedInEmail = String(user.email || '').toLowerCase();
    if (inviteEmail !== signedInEmail) {
      throw new HttpError(403, `This invitation was sent to ${data?.email}. Sign in with that email to accept it`);
    }
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 7 * 86400_000) {
      throw new HttpError(409, 'Invitation has expired. Please ask for a new invitation');
    }
    if (project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
    const assigned = ['admin', 'developer', 'viewer'].includes(data.role) ? data.role : 'viewer';
    const role = org.data()?.ownerId === user.uid ? 'owner' : member.data()?.role || assigned;
    acceptedRole = role;
    tx.set(memberRef, {
      uid: user.uid, email: user.email, displayName: String(user.name || ''), photoURL: String(user.picture || ''),
      role, joinedAt: member.data()?.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(db.doc(`users/${user.uid}`), {
      uid: user.uid,
      email: user.email,
      displayName: String(user.name || ''),
      photoURL: String(user.picture || ''),
      currentOrgId: orgId, orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.update(inviteRef, { status: 'accepted', acceptedBy: user.uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(), inviteToken: admin.firestore.FieldValue.delete() });
  });
  return { success: true, orgId, projectId, role: acceptedRole };
});
