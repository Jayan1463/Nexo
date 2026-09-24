import { writeBatch } from 'firebase/firestore';
import { collection, db, doc, serverTimestamp } from '../firebase';

export async function createProject(orgId: string, name: string, environment: string) {
  const ref = doc(collection(db, `organizations/${orgId}/projects`));
  const batch = writeBatch(db);
  batch.set(doc(db, 'projects', ref.id), { orgId, lifecycle: 'active' });
  batch.set(ref, { id: ref.id, orgId, name, environment, createdAt: serverTimestamp() });
  await batch.commit();
  return ref.id;
}
