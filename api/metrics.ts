import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0298517899";
const FIREBASE_DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID || "ai-studio-a6e8cce4-ae5a-499a-9a1c-ced13c60c908";

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

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: Missing or invalid API key" });
  }

  const apiKey = authHeader.slice("Bearer ".length).trim();
  const { cpu, memory, network, timestamp } = req.body || {};
  const cpuValue = Number(cpu);
  const memoryValue = Number(memory);
  const networkValue = Number(network);

  if (!Number.isFinite(cpuValue) || cpuValue < 0 || cpuValue > 100) {
    return res.status(400).json({ error: "cpu must be a number between 0 and 100" });
  }
  if (!Number.isFinite(memoryValue) || memoryValue < 0 || memoryValue > 100) {
    return res.status(400).json({ error: "memory must be a number between 0 and 100" });
  }
  if (!Number.isFinite(networkValue) || networkValue < 0) {
    return res.status(400).json({ error: "network must be a non-negative number" });
  }

  try {
    const db = getDb();
    const serverSnap = await db.collection("servers").where("apiKey", "==", apiKey).limit(1).get();
    if (serverSnap.empty) {
      return res.status(401).json({ error: "Unauthorized: Invalid API key" });
    }

    const serverDoc = serverSnap.docs[0];
    const serverData = serverDoc.data() as any;
    const serverId = serverDoc.id;
    const projectId = String(serverData.projectId || "");

    await serverDoc.ref.set(
      {
        status: "online",
        lastSeen: new Date().toISOString(),
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
      timestamp: timestamp || new Date().toISOString(),
    });

    const rulesSnap = await db.collection("projects").doc(projectId).collection("alert_rules").doc("default").get();
    const rules = rulesSnap.exists ? (rulesSnap.data() as any) : {};
    const cpuWarning = Number(rules.cpuWarning ?? 90);
    const cpuCritical = Number(rules.cpuCritical ?? 95);
    const memoryWarning = Number(rules.memoryWarning ?? 90);
    const memoryCritical = Number(rules.memoryCritical ?? 95);

    const pendingAlerts: Array<{ alertType: "cpu" | "memory"; severity: "warning" | "critical"; message: string }> = [];
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

    for (const candidate of pendingAlerts) {
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
    }

    return res.status(200).json({ success: true, serverId });
  } catch (error) {
    console.error("Metrics ingest failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
