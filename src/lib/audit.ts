import { collection, doc, serverTimestamp, setDoc } from '../firebase';
import { db } from '../firebase';

export async function writeAuditLog(input: {
  orgId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.orgId && !input.projectId) return;
  const scope = input.orgId
    ? `organizations/${input.orgId}/auditLogs`
    : `projects/${input.projectId}/auditLogs`;
  const ref = doc(collection(db, scope));
  await setDoc(ref, {
    id: ref.id,
    orgId: input.orgId || '',
    projectId: input.projectId || '',
    userId: input.userId || '',
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId || '',
    metadata: input.metadata || {},
    timestamp: serverTimestamp(),
  });
}
