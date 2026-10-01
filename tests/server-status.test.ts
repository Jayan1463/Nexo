import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverStatus, SERVER_OFFLINE_AFTER_MS } from '../shared/server-status';
const now = Date.now();
test('default agent remains connected between heartbeats, including degraded nodes', () => {
  for (const status of ['online', 'degraded']) {
    for (const age of [0, 15_000, 60_000, 120_000, SERVER_OFFLINE_AFTER_MS - 1]) {
      assert.equal(serverStatus({ status, lastSeen: new Date(now - age).toISOString() }, now), status);
    }
  }
});
test('missing, invalid, stale, terminated and revoked servers are offline', () => {
  for (const lastSeen of [undefined, 'invalid', new Date(now - SERVER_OFFLINE_AFTER_MS)]) {
    assert.equal(serverStatus({ status: 'online', lastSeen }, now), 'offline');
  }
  assert.equal(serverStatus({ status: 'offline', lastSeen: new Date(now) }, now), 'offline');
  assert.equal(serverStatus({ status: 'online', lastSeen: new Date(now), deletedAt: 'deleted' }, now), 'offline');
  assert.equal(serverStatus({ status: 'online', lastSeen: new Date(now), apiKeyStatus: 'revoked' }, now), 'offline');
});
test('Firestore timestamps use the same heartbeat policy', () => {
  assert.equal(serverStatus({ status: 'online', lastSeen: { toDate: () => new Date(now - 60_000) } }, now), 'online');
});
