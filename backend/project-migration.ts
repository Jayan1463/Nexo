// Inspect every binding before applying any changes. Duplicate IDs need manual
// resolution; choosing one automatically could grant another tenant access.
export async function migrateProjectBindings(db: FirebaseFirestore.Firestore, apply = false) {
  const orgs = await db.collection('organizations').get();
  const bindings = new Map<string, string>();
  for (const org of orgs.docs) {
    const projects = await org.ref.collection('projects').get();
    for (const project of projects.docs) {
      if (bindings.has(project.id)) throw new Error(`Duplicate project ID: ${project.id}`);
      bindings.set(project.id, org.id);
    }
  }
  const missing: Array<{ projectId: string; orgId: string }> = [];
  for (const [projectId, orgId] of bindings) {
    const existing = await db.doc(`projects/${projectId}`).get();
    if (existing.exists && existing.data()?.orgId !== orgId) throw new Error(`Conflicting project binding: ${projectId}`);
    if (!existing.exists) missing.push({ projectId, orgId });
  }
  if (apply) {
    for (const { projectId, orgId } of missing) {
      await db.doc(`projects/${projectId}`).create({ orgId, lifecycle: 'active' });
    }
  }
  return { inspected: bindings.size, missing: missing.length, applied: apply ? missing.length : 0 };
}
