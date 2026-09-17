import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nexocloud-software";
const FIREBASE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "(default)";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  } catch {
    return null;
  }
}

if (!admin.apps.length) {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: FIREBASE_PROJECT_ID,
    });
  } else {
    admin.initializeApp({
      projectId: FIREBASE_PROJECT_ID,
    });
  }
}

function getDb() {
  const app = admin.app();
  if (FIREBASE_DATABASE_ID) {
    return getFirestore(app, FIREBASE_DATABASE_ID);
  }
  return getFirestore(app);
}

function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

async function findServerByApiKey(db: FirebaseFirestore.Firestore, apiKey: string) {
  const hashed = await db.collection("servers")
    .where("apiKeyHash", "==", hashApiKey(apiKey))
    .where("apiKeyStatus", "==", "active")
    .limit(1)
    .get();
  if (!hashed.empty) return hashed.docs[0];
  const legacy = await db.collection("servers").where("apiKey", "==", apiKey).limit(1).get();
  const legacyDoc = legacy.docs[0];
  return legacyDoc && legacyDoc.data().apiKeyStatus !== "revoked" ? legacyDoc : null;
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const headerKey = typeof req.headers["x-nexo-api-key"] === "string" ? req.headers["x-nexo-api-key"] : "";
  const authHeader = req.headers.authorization || "";
  if (!headerKey && !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid API key" });
  }

  const apiKey = headerKey || authHeader.slice("Bearer ".length).trim();
  const { cpu, memory, network, disk, uptime, processes, ports, services, timestamp } = req.body || {};
  const cpuValue = Number(cpu);
  const memoryValue = Number(memory);
  const networkValue = Number(network);
  const diskValue = Number.isFinite(Number(disk)) ? Number(disk) : 0;

  if (!Number.isFinite(cpuValue) || cpuValue < 0 || cpuValue > 100) {
    return res.status(400).json({ error: "cpu must be a number between 0 and 100" });
  }
  if (!Number.isFinite(memoryValue) || memoryValue < 0 || memoryValue > 100) {
    return res.status(400).json({ error: "memory must be a number between 0 and 100" });
  }
  if (!Number.isFinite(networkValue) || networkValue < 0) {
    return res.status(400).json({ error: "network must be a non-negative number" });
  }
  if (!Number.isFinite(diskValue) || diskValue < 0 || diskValue > 100) {
    return res.status(400).json({ error: "disk must be a number between 0 and 100 when provided" });
  }

  try {
    const db = getDb();
    const serverDoc = await findServerByApiKey(db, apiKey);
    if (!serverDoc) {
      return res.status(401).json({ error: "Unauthorized: Invalid API key" });
    }

    const serverData = serverDoc.data() as any;
    const serverId = serverDoc.id;
    const projectId = String(serverData.projectId || "");

    await serverDoc.ref.set(
      {
        status: cpuValue >= 90 || memoryValue >= 90 || diskValue >= 90 ? "degraded" : "online",
        lastSeen: new Date().toISOString(),
        apiKeyLastUsed: new Date().toISOString(),
      },
      { merge: true },
    );

    const metricRef = serverDoc.ref.collection("metrics").doc();
    await metricRef.set({
      id: metricRef.id,
      serverId,
      projectId,
      cpu: cpuValue,
      memory: memoryValue,
      network: networkValue,
      disk: diskValue,
      uptime: Number.isFinite(Number(uptime)) ? Number(uptime) : 0,
      processes: Array.isArray(processes) ? processes.slice(0, 100) : [],
      ports: Array.isArray(ports) ? ports.slice(0, 100) : [],
      services: Array.isArray(services) ? services.slice(0, 100) : [],
      timestamp: timestamp || new Date().toISOString(),
    });

    const rulesSnap = await db.collection("projects").doc(projectId).collection("alert_rules").doc("default").get();
    const rules = rulesSnap.exists ? (rulesSnap.data() as any) : {};
    const cpuWarning = Number(rules.cpuWarning ?? 90);
    const cpuCritical = Number(rules.cpuCritical ?? 95);
    const memoryWarning = Number(rules.memoryWarning ?? 90);
    const memoryCritical = Number(rules.memoryCritical ?? 95);

    const pendingAlerts: Array<{ alertType: "cpu" | "memory" | "disk"; severity: "warning" | "critical"; message: string }> = [];
    if (cpuValue >= cpuCritical) {
      pendingAlerts.push({ alertType: "cpu", severity: "critical", message: `High CPU detected on ${serverData.name}: ${cpuValue.toFixed(1)}%` });
    } else if (cpuValue >= cpuWarning) {
      pendingAlerts.push({ alertType: "cpu", severity: "warning", message: `Elevated CPU detected on ${serverData.name}: ${cpuValue.toFixed(1)}%` });
    }
    if (memoryValue >= memoryCritical) {
      pendingAlerts.push({ alertType: "memory", severity: "critical", message: `High Memory detected on ${serverData.name}: ${memoryValue.toFixed(1)}%` });
    } else if (memoryValue >= memoryWarning) {
      pendingAlerts.push({ alertType: "memory", severity: "warning", message: `Elevated Memory detected on ${serverData.name}: ${memoryValue.toFixed(1)}%` });
    }
    if (diskValue >= 95) {
      pendingAlerts.push({ alertType: "disk", severity: "critical", message: `Disk capacity risk detected on ${serverData.name}: ${diskValue.toFixed(1)}%` });
    } else if (diskValue >= 90) {
      pendingAlerts.push({ alertType: "disk", severity: "warning", message: `Disk usage elevated on ${serverData.name}: ${diskValue.toFixed(1)}%` });
    }

    for (const candidate of pendingAlerts) {
      const recentAlertsSnap = await db.collection("projects").doc(projectId).collection("alerts")
        .where("serverId", "==", serverId)
        .where("status", "==", "active")
        .limit(50)
        .get();
      const inCooldown = recentAlertsSnap.docs.some((docSnap) => {
        const data = docSnap.data() as any;
        if (data.alertType !== candidate.alertType) return false;
        const ts = new Date(String(data.timestamp || 0)).getTime();
        return Number.isFinite(ts) && Date.now() - ts < 15 * 60 * 1000;
      });
      if (inCooldown) continue;

      const alertRef = db.collection("projects").doc(projectId).collection("alerts").doc();
      await alertRef.set({
        id: alertRef.id,
        projectId,
        serverId,
        alertType: candidate.alertType,
        severity: candidate.severity,
        message: candidate.message,
        status: "active",
        timestamp: new Date().toISOString(),
      });
      if (candidate.severity === "critical") {
        const incidentRef = db.collection("projects").doc(projectId).collection("incidents").doc();
        const now = new Date().toISOString();
        await incidentRef.set({
          id: incidentRef.id,
          projectId,
          serverId,
          title: candidate.message,
          severity: candidate.severity,
          status: "investigating",
          summary: "Auto-created from critical telemetry.",
          publicVisible: Boolean(serverData.publicStatusEnabled),
          timeline: [{ status: "investigating", message: "Incident opened automatically.", timestamp: now }],
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return res.status(200).json({ success: true, serverId });
  } catch (error) {
    console.error("Metrics ingest failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
