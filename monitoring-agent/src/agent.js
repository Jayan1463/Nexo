import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import si from 'systeminformation';

const config = {
  apiUrl: process.env.NEXO_API_URL || 'http://localhost:3000/api/v1/telemetry',
  logApiUrl: process.env.NEXO_LOG_API_URL || 'http://localhost:3000/api/v1/logs',
  serverId: process.env.NEXO_SERVER_ID || os.hostname(),
  apiKey: process.env.NEXO_API_KEY || '',
  intervalMs: Math.max(10, Number(process.env.NEXO_INTERVAL_SECONDS || 60)) * 1000,
  bufferLimit: Math.max(10, Number(process.env.NEXO_BUFFER_LIMIT || 100)),
};

const stateDir = path.join(os.homedir(), '.nexo-cloud-agent');
const bufferFile = path.join(stateDir, 'buffer.json');
let retryDelayMs = 1000;

async function loadBuffer() {
  try {
    return JSON.parse(await fs.readFile(bufferFile, 'utf8'));
  } catch {
    return [];
  }
}

async function saveBuffer(buffer) {
  await fs.mkdir(stateDir, { recursive: true });
  await fs.writeFile(bufferFile, JSON.stringify(buffer.slice(-config.bufferLimit), null, 2));
}

async function collectTelemetry() {
  const [load, mem, disks, networks, processes, connections, services, time, osInfo] = await Promise.all([
    si.currentLoad(),
    si.mem(),
    si.fsSize(),
    si.networkStats(),
    si.processes(),
    si.networkConnections(),
    si.services('*'),
    si.time(),
    si.osInfo(),
  ]);

  const activeNetwork = networks[0] || { rx_sec: 0, tx_sec: 0, iface: 'unknown' };
  const disk = disks[0] || { use: 0, used: 0, available: 0, size: 0, mount: '/' };

  return {
    serverId: config.serverId,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    os: `${osInfo.distro || osInfo.platform} ${osInfo.release || ''}`.trim(),
    cpu: Math.round(load.currentLoad),
    cpuCores: load.cpus?.map((core) => Math.round(core.load)) || [],
    memory: Math.round((mem.active / mem.total) * 100),
    memoryDetail: { used: mem.active, free: mem.free, total: mem.total },
    disk: Math.round(disk.use),
    diskDetail: {
      mount: disk.mount,
      used: disk.used,
      available: disk.available,
      total: disk.size,
      percentage: disk.use,
    },
    network: Math.round(((activeNetwork.rx_sec || 0) + (activeNetwork.tx_sec || 0)) / 1024),
    networkDetail: networks.map((item) => ({
      interface: item.iface,
      bytesReceived: item.rx_bytes,
      bytesSent: item.tx_bytes,
      receivePerSecond: item.rx_sec,
      transmitPerSecond: item.tx_sec,
    })),
    processes: processes.list.slice(0, 50).map((process) => ({
      pid: process.pid,
      name: process.name,
      cpu: process.cpu,
      memory: process.mem,
    })),
    ports: [...new Set(connections.map((connection) => connection.localPort).filter(Boolean))].slice(0, 100),
    services: services.slice(0, 50).map((service) => ({
      name: service.name,
      status: service.running ? 'running' : 'stopped',
    })),
    uptime: time.uptime,
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Nexo-API-Key': config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Nexo API ${response.status}: ${await response.text()}`);
  }
}

async function flushBuffer() {
  const buffer = await loadBuffer();
  if (!buffer.length) return;
  const remaining = [];
  for (const payload of buffer) {
    try {
      await postJson(config.apiUrl, payload);
    } catch {
      remaining.push(payload);
    }
  }
  await saveBuffer(remaining);
}

async function tick() {
  if (!config.apiKey) {
    console.error('NEXO_API_KEY is required.');
    return;
  }

  const payload = await collectTelemetry();
  try {
    await flushBuffer();
    await postJson(config.apiUrl, payload);
    retryDelayMs = 1000;
    console.log(`[${new Date().toLocaleTimeString()}] sent cpu=${payload.cpu}% memory=${payload.memory}% disk=${payload.disk}%`);
  } catch (error) {
    const buffer = await loadBuffer();
    buffer.push(payload);
    await saveBuffer(buffer);
    console.error(`send failed, buffered reading: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    retryDelayMs = Math.min(retryDelayMs * 2, 60_000);
  }
}

setInterval(() => void tick(), config.intervalMs);
void tick();
