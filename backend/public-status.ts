import { documentId, endpoint } from './database';

function publicServerStatus(data: FirebaseFirestore.DocumentData, now: number) {
  if (!['online', 'degraded'].includes(data.status)) return 'offline';
  const lastSeen = data.lastSeen?.toDate?.() ?? new Date(data.lastSeen || 0);
  return lastSeen instanceof Date && Number.isFinite(lastSeen.getTime()) &&
    now - lastSeen.getTime() < 15000 ? data.status : 'offline';
}

function publicLogSummary(value: unknown) {
  const normalized = String(value || 'System event observed')
    .replace(/\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\bhttps?:\/\/\S+/gi, '[url]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[ip]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, '[id]')
    .replace(/(?:\/[A-Za-z0-9._-]+){2,}/g, '[path]')
    .replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[redacted]')
    .replace(/\s+/g, ' ')
    .trim();
  return (normalized || 'System event observed').slice(0, 140);
}

function publicLogTimestamp(value: unknown) {
  const date = (value as any)?.toDate?.() ?? new Date(String(value || ''));
  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export default endpoint('GET', async (req, db) => {
  const projectId = documentId(req.query.projectId || process.env.PUBLIC_STATUS_PROJECT_ID);
  const project = await db.doc(`projects/${projectId}`).get();
  if (!project.exists || project.data()?.lifecycle !== 'active') return { servers: [], incidents: [], logs: [] };
  const [servers, incidents, logs] = await Promise.all([
    db.collection('servers').where('projectId', '==', projectId).where('publicStatusEnabled', '==', true).get(),
    db.collection(`projects/${projectId}/incidents`).where('publicVisible', '==', true).get(),
    db.collection(`projects/${projectId}/logs`).orderBy('timestamp', 'desc').limit(60).get(),
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
    logs: logs.docs
      .filter((doc) => names.has(String(doc.data().serverId || '')))
      .slice(0, 8)
      .map((doc) => {
        const data = doc.data();
        const level = data.level === 'error' || data.level === 'warn' ? data.level : 'info';
        return {
          id: doc.id,
          source: String(names.get(data.serverId) || 'Service'),
          level,
          summary: publicLogSummary(data.message),
          timestamp: publicLogTimestamp(data.timestamp),
        };
      }),
  };
});
