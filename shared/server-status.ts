// Allow three missed heartbeats from the agent's default 60-second interval.
export const SERVER_OFFLINE_AFTER_MS = 180_000;

export function serverStatus(data: { status?: string; lastSeen?: any; deletedAt?: any; apiKeyStatus?: string }, now = Date.now()): 'online' | 'degraded' | 'offline' {
  if (data.deletedAt || data.apiKeyStatus === 'revoked' || !['online', 'degraded'].includes(data.status || '')) return 'offline';
  const date = data.lastSeen?.toDate?.() ?? new Date(data.lastSeen || 0);
  return date instanceof Date && Number.isFinite(date.getTime()) && data.lastSeen &&
    now - date.getTime() < SERVER_OFFLINE_AFTER_MS ? data.status as 'online' | 'degraded' : 'offline';
}
