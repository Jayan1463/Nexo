import { documentId, endpoint, HttpError, identity, orgRole } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  const orgId = documentId(req.body?.orgId);
  const projectId = documentId(req.body?.projectId);
  if (!['owner', 'admin'].includes(await orgRole(db, user.uid, orgId))) {
    throw new HttpError(403, 'Only workspace administrators can delete projects');
  }
  const root = db.doc(`projects/${projectId}`);
  const projectRef = db.doc(`organizations/${orgId}/projects/${projectId}`);
  await db.runTransaction(async (tx) => {
    const project = await tx.get(root);
    if (!project.exists) throw new HttpError(404, 'Project not found');
    if (project.data()?.orgId !== orgId) throw new HttpError(403, 'Project access denied');
    if (project.data()?.lifecycle === 'deleted') return;
    const siblings = await tx.get(db.collection(`organizations/${orgId}/projects`));
    if (project.data()?.lifecycle !== 'deleting' && siblings.docs.filter((d) => d.data().lifecycle !== 'deleting').length <= 1) {
      throw new HttpError(409, 'Create another project before deleting the last project');
    }
    tx.update(root, { lifecycle: 'deleting' });
    tx.set(projectRef, { lifecycle: 'deleting' }, { merge: true });
  });
  // Retain a minimal ownership tombstone so retries are safe and IDs cannot be reused.
  // If cleanup fails the deleting state blocks writes; the same request resumes it.
  const servers = await db.collection('servers').where('projectId', '==', projectId).get();
  for (const server of servers.docs) await db.recursiveDelete(server.ref);
  const collections = await root.listCollections();
  for (const collection of collections) await db.recursiveDelete(collection);
  await db.runTransaction(async (tx) => {
    tx.delete(projectRef);
    tx.set(root, { orgId, lifecycle: 'deleted', deletedAt: new Date().toISOString() });
  });
  return { success: true };
});
