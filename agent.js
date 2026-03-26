import os from 'node:os';

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [rawKey, ...rest] = arg.replace(/^--/, '').split('=');
  if (!rawKey) return acc;
  acc[rawKey] = rest.join('=');
  return acc;
}, {});

const API_KEY = args.key || process.env.NEXO_API_KEY || process.env.API_KEY;
const SERVER_ID = args.serverId || process.env.NEXO_SERVER_ID || process.env.SERVER_ID;
const API_URL = args.apiUrl
  || process.env.NEXO_API_URL
  || (process.env.APP_URL ? `${process.env.APP_URL}/api/metrics` : 'https://mrithyunjayan.me/api/metrics');

if (!API_KEY || !SERVER_ID) {
  console.error('Usage: node agent.js --key=YOUR_API_KEY --serverId=YOUR_SERVER_ID [--apiUrl=API_URL]');
  console.error('or set env vars: NEXO_API_KEY and NEXO_SERVER_ID');
  process.exit(1);
}

console.log('Nexo Cloud Agent starting...');
console.log(`Target: ${API_URL}`);
console.log(`Server ID: ${SERVER_ID}`);

let previousCpu = os.cpus();
let previousNet = os.networkInterfaces();
let previousAt = Date.now();

function getCpuPercent() {
  const current = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  for (let i = 0; i < current.length; i += 1) {
    const prevTimes = previousCpu[i]?.times;
    const curTimes = current[i].times;
    const prevTotal = prevTimes
      ? prevTimes.user + prevTimes.nice + prevTimes.sys + prevTimes.idle + prevTimes.irq
      : 0;
    const curTotal = curTimes.user + curTimes.nice + curTimes.sys + curTimes.idle + curTimes.irq;
    const total = Math.max(curTotal - prevTotal, 1);
    const idle = Math.max(curTimes.idle - (prevTimes?.idle || 0), 0);

    totalIdle += idle;
    totalTick += total;
  }

  previousCpu = current;
  const usage = 100 - Math.round((totalIdle / Math.max(totalTick, 1)) * 100);
  return Math.min(100, Math.max(0, usage));
}

function getMemoryPercent() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usage = Math.round((used / total) * 100);
  return Math.min(100, Math.max(0, usage));
}

function sumBytesPerSecond(interfacesSnapshotA, interfacesSnapshotB, elapsedMs) {
  if (!elapsedMs || elapsedMs <= 0) return 0;

  // Node's built-in APIs don't expose bytes counters directly across platforms.
  // We keep this value safe and non-negative for backend validation.
  void interfacesSnapshotA;
  void interfacesSnapshotB;

  return 0;
}

async function collectAndSend() {
  try {
    const now = Date.now();
    const nowNet = os.networkInterfaces();
    const elapsedMs = now - previousAt;

    const metrics = {
      cpu: getCpuPercent(),
      memory: getMemoryPercent(),
      network: sumBytesPerSecond(previousNet, nowNet, elapsedMs),
      timestamp: new Date().toISOString(),
    };

    previousNet = nowNet;
    previousAt = now;

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metrics),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    console.log(`[${new Date().toLocaleTimeString()}] Metrics sent: CPU ${metrics.cpu}% | MEM ${metrics.memory}% | NET ${metrics.network}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error sending metrics:', message);
  }
}

setInterval(collectAndSend, 5000);
collectAndSend();
