import { documentId, endpoint } from './database';

function publicServerStatus(data: FirebaseFirestore.DocumentData, now: number) {
  if (!['online', 'degraded'].includes(data.status)) return 'offline';
  const lastSeen = data.lastSeen?.toDate?.() ?? new Date(data.lastSeen || 0);
  return lastSeen instanceof Date && Number.isFinite(lastSeen.getTime()) &&
    now - lastSeen.getTime() < 15000 ? data.status : 'offline';
}

export default endpoint('GET', async (req, db) => {
  const projectId = documentId(req.query.projectId);
  const project = await db.doc(`projects/${projectId}`).get();
  if (!project.exists || project.data()?.lifecycle !== 'active') return { servers: [], incidents: [] };
  const [servers, incidents] = await Promise.all([
    db.collection('servers').where('projectId', '==', projectId).where('publicStatusEnabled', '==', true).get(),
    db.collection(`projects/${projectId}/incidents`).where('publicVisible', '==', true).get(),
  ]);
  const publicServers = servers.docs.filter((doc) => !doc.data().deletedAt);
  const names = new Map(publicServers.map((doc) => [doc.id, doc.data().publicName || doc.data().name]));
  const now = Date.now();
  return {
    servers: publicServers.map((doc) => ({
      id: doc.id,
      publicName: String(names.get(doc.id) || 'Service'),
      status: publicServerStatus(doc.data(), now),
    })),
    incidents: incidents.docs.filter((doc) => !doc.data().serverId || names.has(doc.data().serverId))
      .sort((a, b) => String(b.data().createdAt).localeCompare(String(a.data().createdAt))).slice(0, 30)
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          // Automatically generated titles contain internal node names.
          title: data.serverId ? `${names.get(data.serverId)} service incident` : String(data.title || 'Service incident'),
          summary: data.serverId ? 'Service performance is being monitored.' : String(data.summary || ''),
          severity: data.severity,
          status: data.status,
        };
      }),
  };
});
