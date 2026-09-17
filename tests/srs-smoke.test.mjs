import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function canRole(role, action) {
  const rank = { viewer: 1, developer: 2, admin: 3, owner: 4 };
  if (action === 'read') return rank[role] >= 1;
  if (action === 'operate') return rank[role] >= 2;
  if (action === 'admin') return rank[role] >= 3;
  return false;
}

function evaluateAlert(metric, rule) {
  if (!rule.enabled) return false;
  if (rule.operator === '>') return metric > rule.threshold;
  if (rule.operator === '>=') return metric >= rule.threshold;
  if (rule.operator === '<') return metric < rule.threshold;
  if (rule.operator === '<=') return metric <= rule.threshold;
  return metric === rule.threshold;
}

function sanitizePublicStatus(server) {
  return {
    displayName: server.publicName,
    status: server.status,
  };
}

assert.equal(hashApiKey('nexo_live_test').length, 64);
assert.equal(canRole('viewer', 'read'), true);
assert.equal(canRole('viewer', 'operate'), false);
assert.equal(canRole('developer', 'operate'), true);
assert.equal(canRole('developer', 'admin'), false);
assert.equal(canRole('admin', 'admin'), true);
assert.equal(evaluateAlert(91, { enabled: true, operator: '>', threshold: 90 }), true);
assert.equal(evaluateAlert(90, { enabled: true, operator: '>', threshold: 90 }), false);
assert.deepEqual(
  sanitizePublicStatus({ publicName: 'API', status: 'online', ip: '10.0.0.1', ports: [22] }),
  { displayName: 'API', status: 'online' },
);

const rbacSource = fs.readFileSync(new URL('../src/lib/rbac.ts', import.meta.url), 'utf8');
assert.match(rbacSource, /team:\s*'admin'/);
assert.match(rbacSource, /apiKeys:\s*'admin'/);
assert.doesNotMatch(rbacSource, /return true;\s*}/);

const sidebarSource = fs.readFileSync(new URL('../src/components/Sidebar.tsx', import.meta.url), 'utf8');
assert.match(sidebarSource, /filter\(\(item\) => canAccessTab\(userRole, item\.id\)\)/);
assert.doesNotMatch(sidebarSource, /Demo Data/);
assert.doesNotMatch(sidebarSource, /id:\s*'demo'/);

const appSource = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(appSource, /DemoSeed/);
assert.doesNotMatch(appSource, /activeTab === 'demo'/);
assert.doesNotMatch(appSource, />View Demo</);

const serversSource = fs.readFileSync(new URL('../src/pages/Servers.tsx', import.meta.url), 'utf8');
assert.match(serversSource, /crypto\.randomUUID\(\)/);
assert.match(serversSource, /nexo_live_/);
assert.doesNotMatch(serversSource, /const serverId = Math\.random/);
assert.match(serversSource, /server_registered/);
assert.match(serversSource, /api_key_generated/);
assert.match(serversSource, /const \[cpu, mem, net, fs, processes, connections, services, time\]/);

const serverSource = fs.readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
assert.match(serverSource, /apiKeyLastUsed/);
assert.match(serverSource, /NEXO_DEMO_MODE !== "true"/);

const metricsSource = fs.readFileSync(new URL('../api/metrics.ts', import.meta.url), 'utf8');
assert.match(metricsSource, /apiKeyLastUsed/);
assert.match(metricsSource, /disk must be a number between 0 and 100/);
assert.match(metricsSource, /inCooldown/);

const collectorSource = fs.readFileSync(new URL('../metrics-collector.js', import.meta.url), 'utf8');
assert.match(collectorSource, /NEXO_DEMO_MODE/);

console.log('SRS smoke tests passed');
