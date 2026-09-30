# Nexo API source code

Generated from project: `/Users/mrithyunjayanm/Projects/Nexo`


## `api/accept-invite.ts`

```ts
export { default } from '../backend/accept-invite';

```

## `api/deep-scan.ts`

```ts
export { default } from '../backend/deep-scan';

```

## `api/delete-account.ts`

```ts
import { existsSync, readFileSync } from 'node:fs';
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nexocloud-software";
const FIREBASE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "(default)";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw);
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

async function deleteDocs(docs: FirebaseFirestore.QueryDocumentSnapshot[]) {
  if (docs.length === 0) return;
  const db = getDb();
  const chunkSize = 400;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const batch = db.batch();
    const chunk = docs.slice(i, i + chunkSize);
    for (const docSnap of chunk) {
      batch.delete(docSnap.ref);
    }
    await batch.commit();
  }
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

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(503).json({
      error: "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel env.",
    });
  }

  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.slice("Bearer ".length).trim();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = String(decoded.email || "").trim().toLowerCase();
    const db = getDb();

    const ownedOrgsSnap = await db.collection("organizations").where("ownerId", "==", uid).limit(1).get();
    if (!ownedOrgsSnap.empty) {
      return res.status(409).json({
        error: "You own an organization. Transfer ownership before deleting your account.",
      });
    }

    const memberDocs = await db.collectionGroup("members").where("uid", "==", uid).get();
    await deleteDocs(memberDocs.docs);

    const invitedByDocs = await db.collectionGroup("invites").where("invitedBy", "==", uid).get();
    await deleteDocs(invitedByDocs.docs);

    if (email) {
      const inviteDocsByEmail = await db.collectionGroup("invites").where("email", "==", email).get();
      const pendingInviteDocs = inviteDocsByEmail.docs.filter((docSnap) => docSnap.data().status === "pending");
      await deleteDocs(pendingInviteDocs);
    }

    await db.collection("users").doc(uid).delete().catch(() => undefined);
    await admin.auth().deleteUser(uid);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return res.status(500).json({ error: "Failed to delete account." });
  }
}

```

## `api/delete-project.ts`

```ts
export { default } from '../backend/delete-project';

```

## `api/invite.ts`

```ts
import { sendInvitationEmail } from '../backend/invitation-email';
import { existsSync, readFileSync } from 'node:fs';
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nexocloud-software";
const FIREBASE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "(default)";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw);
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

  const authHeader = String(req.headers.authorization || "");
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  let decoded: admin.auth.DecodedIdToken;
  try {
    decoded = await admin.auth().verifyIdToken(authHeader.slice(7).trim());
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
  const { email, orgId, role } = req.body || {};
  if (!email || !orgId) {
    return res.status(400).json({ error: "Email and orgId are required" });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(503).json({
      error: "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel env.",
    });
  }

  try {
    const db = getDb();
    const orgSnap = await db.collection("organizations").doc(orgId).get();
    if (!orgSnap.exists) return res.status(404).json({ error: "Organization not found" });
    const memberSnap = await db.collection(`organizations/${orgId}/members`).doc(decoded.uid).get();
    const memberRole = String(memberSnap.data()?.role || "");
    if (orgSnap.data()?.ownerId !== decoded.uid && memberRole !== "owner" && memberRole !== "admin") {
      return res.status(403).json({ error: "Only owner/admin can invite members" });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: "Invalid email format" });
    }
    if (normalizedEmail.length > 254) {
      return res.status(400).json({ error: "Email is too long" });
    }
    const normalizedRole =
      role === "admin" || role === "developer" || role === "viewer" ? role : "viewer";
    const token = crypto.randomBytes(24).toString("hex");
    const host = req.headers.host || "localhost:3000";
    const appUrl = (process.env.APP_URL || `https://${host}`).replace(/\/$/, "");

    const inviteRef = db.collection("organizations").doc(orgId).collection("invites").doc();
    const inviteLink = `${appUrl}/accept-invite?orgId=${encodeURIComponent(orgId)}&inviteId=${encodeURIComponent(
      inviteRef.id,
    )}&token=${encodeURIComponent(token)}`;

    await inviteRef.set({
      id: inviteRef.id,
      email: normalizedEmail,
      orgId,
      role: normalizedRole,
      invitedBy: decoded.uid,
      status: "pending",
      inviteToken: token,
      inviteLink,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const delivery = await sendInvitationEmail(normalizedEmail, orgSnap.data()?.name || 'your organization', normalizedRole, inviteLink);
    return res.status(200).json({ success: true, inviteId: inviteRef.id, ...delivery,
      ...(!delivery.emailSent ? { inviteLink } : {}),
    });
  } catch (error) {
    console.error("Error sending invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

```

## `api/logs.ts`

```ts
import { activeServerWrite, HttpError } from '../backend/database';
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";
import { existsSync, readFileSync } from "fs";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nexocloud-software";
const FIREBASE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "(default)";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const serviceAccountJson = existsSync(raw) ? readFileSync(raw, "utf8") : raw;
    const parsed = JSON.parse(serviceAccountJson);
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
  const { level, message, service, timestamp } = req.body || {};
  const normalizedLevel = level === "info" || level === "warn" || level === "error" ? level : "info";
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  if (typeof service !== "string" || !service.trim()) {
    return res.status(400).json({ error: "service is required" });
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

    const logRef = db.collection("projects").doc(projectId).collection("logs").doc();
    await activeServerWrite(db, serverId, (tx) => tx.set(logRef, {
      id: logRef.id,
      serverId,
      projectId,
      level: normalizedLevel,
      message: message.trim(),
      service: service.trim(),
      timestamp: timestamp || new Date().toISOString(),
    }));

    return res.status(200).json({ success: true, logId: logRef.id });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    console.error("Logs ingest failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

```

## `api/metrics.ts`

```ts
import { activeServerWrite, HttpError } from '../backend/database';
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";
import { existsSync, readFileSync } from "fs";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "nexocloud-software";
const FIREBASE_DATABASE_ID = process.env.FIREBASE_DATABASE_ID || "(default)";

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const serviceAccountJson = existsSync(raw) ? readFileSync(raw, "utf8") : raw;
    const parsed = JSON.parse(serviceAccountJson);
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

    const metricRef = serverDoc.ref.collection("metrics").doc();
    await activeServerWrite(db, serverId, (tx) => {
    tx.set(serverDoc.ref,
      {
        status: cpuValue >= 90 || memoryValue >= 90 || diskValue >= 90 ? "degraded" : "online",
        lastSeen: new Date().toISOString(),
        apiKeyLastUsed: new Date().toISOString(),
      },
      { merge: true },
    );

      tx.set(metricRef, {
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
      await activeServerWrite(db, serverId, (tx) => tx.set(alertRef, {
        id: alertRef.id,
        projectId,
        serverId,
        alertType: candidate.alertType,
        severity: candidate.severity,
        message: candidate.message,
        status: "active",
        timestamp: new Date().toISOString(),
      }));
      if (candidate.severity === "critical") {
        const incidentRef = db.collection("projects").doc(projectId).collection("incidents").doc();
        const now = new Date().toISOString();
        await activeServerWrite(db, serverId, (tx) => tx.set(incidentRef, {
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
        }));
      }
    }

    return res.status(200).json({ success: true, serverId });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    console.error("Metrics ingest failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

```

## `api/public-status.ts`

```ts
export { default } from '../backend/public-status';

```

## `api/v1/events.ts`

```ts
export { default } from '../metrics';

```

## `api/v1/logs.ts`

```ts
export { default } from '../logs';

```

## `api/v1/telemetry.ts`

```ts
export { default } from '../metrics';

```
