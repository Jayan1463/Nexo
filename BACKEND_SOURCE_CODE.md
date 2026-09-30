# Nexo backend source code

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

## `backend/accept-invite.ts`

```ts
import admin from 'firebase-admin';
import { documentId, endpoint, HttpError, identity } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  if (!user.email_verified) throw new HttpError(403, 'Verify your email before accepting an invitation');
  const orgId = documentId(req.body?.orgId);
  const inviteId = documentId(req.body?.inviteId);
  const token = req.body?.token;
  if (typeof token !== 'string' || !token) throw new HttpError(400, 'Invitation token is required');
  const orgRef = db.doc(`organizations/${orgId}`);
  const projects = await orgRef.collection('projects').get();
  let projectId = '';
  for (const project of projects.docs) {
    const binding = await db.doc(`projects/${project.id}`).get();
    if (binding.data()?.orgId === orgId && binding.data()?.lifecycle === 'active') { projectId = project.id; break; }
  }
  if (!projectId) throw new HttpError(409, 'Organization has no active project');
  const inviteRef = orgRef.collection('invites').doc(inviteId);
  const memberRef = orgRef.collection('members').doc(user.uid);
  let acceptedRole = 'viewer';
  await db.runTransaction(async (tx) => {
    const [org, invite, member, project] = await Promise.all([
      tx.get(orgRef), tx.get(inviteRef), tx.get(memberRef), tx.get(db.doc(`projects/${projectId}`)),
    ]);
    const data = invite.data();
    const createdAt = data?.createdAt?.toMillis?.() ?? Date.parse(data?.createdAt || '');
    if (!org.exists) throw new HttpError(404, 'Organization was not found');
    if (data?.status !== 'pending') throw new HttpError(409, 'Invitation has already been used or cancelled');
    if (data?.inviteToken !== token) throw new HttpError(409, 'Invitation link is invalid. Please ask for a new invitation');
    const inviteEmail = String(data?.email || '').toLowerCase();
    const signedInEmail = String(user.email || '').toLowerCase();
    if (inviteEmail !== signedInEmail) {
      throw new HttpError(403, `This invitation was sent to ${data?.email}. Sign in with that email to accept it`);
    }
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > 7 * 86400_000) {
      throw new HttpError(409, 'Invitation has expired. Please ask for a new invitation');
    }
    if (project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
    const assigned = ['admin', 'developer', 'viewer'].includes(data.role) ? data.role : 'viewer';
    const role = org.data()?.ownerId === user.uid ? 'owner' : member.data()?.role || assigned;
    acceptedRole = role;
    tx.set(memberRef, {
      uid: user.uid, email: user.email, displayName: String(user.name || ''), photoURL: String(user.picture || ''),
      role, joinedAt: member.data()?.joinedAt || admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.set(db.doc(`users/${user.uid}`), {
      uid: user.uid,
      email: user.email,
      displayName: String(user.name || ''),
      photoURL: String(user.picture || ''),
      currentOrgId: orgId, orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    tx.update(inviteRef, { status: 'accepted', acceptedBy: user.uid,
      acceptedAt: admin.firestore.FieldValue.serverTimestamp(), inviteToken: admin.firestore.FieldValue.delete() });
  });
  return { success: true, orgId, projectId, role: acceptedRole };
});

```

## `backend/database.ts`

```ts
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';

export function database() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const account = raw ? JSON.parse(existsSync(raw) ? readFileSync(raw, 'utf8') : raw) : null;
    if (account?.private_key) account.private_key = account.private_key.replace(/\\n/g, '\n');
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'nexocloud-software',
      ...(account ? { credential: admin.credential.cert(account) } : {}),
    });
  }
  return getFirestore(admin.app(), process.env.FIREBASE_DATABASE_ID || '(default)');
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function endpoint(method: string, action: (req: any, db: FirebaseFirestore.Firestore) => Promise<unknown>) {
  return async (req: any, res: any) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== method) return res.status(405).json({ error: 'Method not allowed' });
    try {
      return res.status(200).json(await action(req, database()));
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      console.error('Database operation failed', error);
      return res.status(500).json({ error: 'Database operation failed. Please retry.' });
    }
  };
}

export function documentId(value: unknown): string {
  if (typeof value !== 'string' || !value || value.includes('/') || value.length > 128) {
    throw new HttpError(400, 'A valid document ID is required');
  }
  return value;
}

export async function identity(req: any) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Sign in required');
  try { return await admin.auth().verifyIdToken(header.slice(7)); }
  catch { throw new HttpError(401, 'Invalid token'); }
}

export async function orgRole(db: FirebaseFirestore.Firestore, uid: string, orgId: string) {
  const org = await db.doc(`organizations/${orgId}`).get();
  if (!org.exists) throw new HttpError(404, 'Organization not found');
  if (org.data()?.ownerId === uid) return 'owner';
  const member = await db.doc(`organizations/${orgId}/members/${uid}`).get();
  const role = member.data()?.role;
  if (!['admin', 'developer', 'viewer'].includes(role)) throw new HttpError(403, 'Organization access denied');
  return role as string;
}

// All ingestion writes recheck the project and server in the same transaction.
// Marking a project as deleting prevents late writes from recreating its data.
export async function activeServerWrite(
  db: FirebaseFirestore.Firestore,
  serverId: string,
  write: (tx: FirebaseFirestore.Transaction) => void,
) {
  await db.runTransaction(async (tx) => {
    const server = await tx.get(db.doc(`servers/${serverId}`));
    if (!server.exists || server.data()?.deletedAt || server.data()?.apiKeyStatus === 'revoked') {
      throw new HttpError(401, 'Server key is inactive');
    }
    const project = await tx.get(db.doc(`projects/${server.data()!.projectId}`));
    if (!project.exists || project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
    write(tx);
  });
}

```

## `backend/deep-scan.ts`

```ts
import { activeServerWrite, documentId, endpoint, HttpError, identity, orgRole } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  const serverId = documentId(req.body?.serverId);
  const lookbackHours = req.body?.lookbackHours ?? 24;
  const serverRef = db.doc(`servers/${serverId}`);
  const serverSnap = await serverRef.get();
  if (!serverSnap.exists || serverSnap.data()?.deletedAt) throw new HttpError(404, 'Server not found');
  const project = await db.doc(`projects/${serverSnap.data()!.projectId}`).get();
  if (!project.exists || project.data()?.lifecycle !== 'active') throw new HttpError(409, 'Project is inactive');
  await orgRole(db, user.uid, documentId(project.data()!.orgId));
      const lookback = Number.isFinite(Number(lookbackHours)) ? Math.min(Math.max(Number(lookbackHours), 1), 168) : 24;
      const since = new Date(Date.now() - lookback * 60 * 60 * 1000);

      const metricsSnap = await serverRef
        .collection("metrics")
        .orderBy("timestamp", "desc")
        .limit(500)
        .get();

      const recentMetrics = metricsSnap.docs
        .map((doc) => doc.data())
        .filter((metric: any) => {
          const ts = new Date(metric.timestamp);
          return !Number.isNaN(ts.getTime()) && ts >= since;
        });

      if (recentMetrics.length === 0) {
        return {
          success: true,
          scan: {
            serverId,
            lookbackHours: lookback,
            scannedPoints: 0,
            anomaliesDetected: 0,
            riskLevel: "none",
            findings: [],
            executedAt: new Date().toISOString(),
          },
        };
      }

      const findings: { type: string; severity: "warning" | "critical"; message: string }[] = [];
      let cpuSpikeCount = 0;
      let memSpikeCount = 0;
      let netSpikeCount = 0;

      for (const metric of recentMetrics) {
        if (metric.cpu >= 95) cpuSpikeCount += 1;
        if (metric.memory >= 92) memSpikeCount += 1;
        if (metric.network >= 900) netSpikeCount += 1;
      }

      if (cpuSpikeCount >= 3) {
        findings.push({
          type: "cpu_spike",
          severity: cpuSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${cpuSpikeCount} high CPU spikes in last ${lookback}h`,
        });
      }
      if (memSpikeCount >= 3) {
        findings.push({
          type: "memory_pressure",
          severity: memSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${memSpikeCount} memory pressure events in last ${lookback}h`,
        });
      }
      if (netSpikeCount >= 3) {
        findings.push({
          type: "network_surge",
          severity: netSpikeCount >= 10 ? "critical" : "warning",
          message: `Detected ${netSpikeCount} network surge events in last ${lookback}h`,
        });
      }

      const avgCpu = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.cpu || 0), 0) / recentMetrics.length;
      const avgMem = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.memory || 0), 0) / recentMetrics.length;
      const avgNet = recentMetrics.reduce((sum: number, m: any) => sum + Number(m.network || 0), 0) / recentMetrics.length;

      const riskScore = avgCpu * 0.45 + avgMem * 0.45 + Math.min(avgNet / 10, 100) * 0.1 + findings.length * 10;
      const riskLevel = riskScore >= 85 ? "critical" : riskScore >= 60 ? "elevated" : riskScore >= 35 ? "normal" : "none";

      const scanRef = serverRef.collection("deep_scans").doc();
      const scan = {
        id: scanRef.id,
        serverId,
        lookbackHours: lookback,
        scannedPoints: recentMetrics.length,
        anomaliesDetected: findings.length,
        riskLevel,
        findings,
        averages: {
          cpu: Number(avgCpu.toFixed(2)),
          memory: Number(avgMem.toFixed(2)),
          network: Number(avgNet.toFixed(2)),
        },
        executedAt: new Date().toISOString(),
      };
      await activeServerWrite(db, serverId, (tx) => tx.set(scanRef, scan));


  return { success: true, scan };
});

```

## `backend/delete-project.ts`

```ts
import { documentId, endpoint, HttpError, identity, orgRole } from './database';

export default endpoint('POST', async (req, db) => {
  const user = await identity(req);
  const orgId = documentId(req.body?.orgId);
  const projectId = documentId(req.body?.projectId);
  if (!['owner', 'admin'].includes(await orgRole(db, user.uid, orgId))) {
    throw new HttpError(403, 'Only workspace administrators can delete projects');
  }
  const root = db.doc(`projects/${projectId}`);
  const projectRef = db.doc(`organizations/${orgId}/projects/${projectId}`);
  await db.runTransaction(async (tx) => {
    const project = await tx.get(root);
    if (!project.exists) throw new HttpError(404, 'Project not found');
    if (project.data()?.orgId !== orgId) throw new HttpError(403, 'Project access denied');
    if (project.data()?.lifecycle === 'deleted') return;
    const siblings = await tx.get(db.collection(`organizations/${orgId}/projects`));
    if (project.data()?.lifecycle !== 'deleting' && siblings.docs.filter((d) => d.data().lifecycle !== 'deleting').length <= 1) {
      throw new HttpError(409, 'Create another project before deleting the last project');
    }
    tx.update(root, { lifecycle: 'deleting' });
    tx.set(projectRef, { lifecycle: 'deleting' }, { merge: true });
  });
  // Retain a minimal ownership tombstone so retries are safe and IDs cannot be reused.
  // If cleanup fails the deleting state blocks writes; the same request resumes it.
  const servers = await db.collection('servers').where('projectId', '==', projectId).get();
  for (const server of servers.docs) await db.recursiveDelete(server.ref);
  const collections = await root.listCollections();
  for (const collection of collections) await db.recursiveDelete(collection);
  await db.runTransaction(async (tx) => {
    tx.delete(projectRef);
    tx.set(root, { orgId, lifecycle: 'deleted', deletedAt: new Date().toISOString() });
  });
  return { success: true };
});

```

## `backend/invitation-email.ts`

```ts
export async function sendInvitationEmail(email: string, orgName: string, role: string, inviteLink: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { emailSent: false, emailError: 'Invitation email is not configured. Set RESEND_API_KEY on the API server.' };
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.INVITE_FROM_EMAIL || 'Nexo Cloud <onboarding@resend.dev>',
        to: [email],
        subject: `You're invited to join ${orgName} on Nexo Cloud`,
        text: `You were invited to join ${orgName} as ${role}.\n\nAccept invitation: ${inviteLink}\n\nSign in with ${email} and verify your email to join the organization with this role. This invitation expires in 7 days.\n\nIf you don't recognize this invitation, you can ignore this email.`,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (response.ok && typeof result.id === 'string') return { emailSent: true, emailId: result.id };
    const emailError = response.status === 401
      ? 'Resend rejected the API key. Update RESEND_API_KEY on the API server.'
      : response.status === 403 || response.status === 422
        ? 'Resend rejected the sender or recipient. Set INVITE_FROM_EMAIL to an address on your verified Resend domain; the resend.dev testing sender cannot email teammates.'
        : response.status === 429
          ? 'Resend sending limit reached. Try again later or share the invitation link.'
          : 'Resend could not send the invitation. Check the email provider dashboard or share the invitation link.';
    return { emailSent: false, emailError };
  } catch {
    return { emailSent: false, emailError: 'Could not reach Resend. Check the API server connection or share the invitation link.' };
  }
}

```

## `backend/project-migration.ts`

```ts
// Inspect every binding before applying any changes. Duplicate IDs need manual
// resolution; choosing one automatically could grant another tenant access.
export async function migrateProjectBindings(db: FirebaseFirestore.Firestore, apply = false) {
  const orgs = await db.collection('organizations').get();
  const bindings = new Map<string, string>();
  for (const org of orgs.docs) {
    const projects = await org.ref.collection('projects').get();
    for (const project of projects.docs) {
      if (bindings.has(project.id)) throw new Error(`Duplicate project ID: ${project.id}`);
      bindings.set(project.id, org.id);
    }
  }
  const missing: Array<{ projectId: string; orgId: string }> = [];
  for (const [projectId, orgId] of bindings) {
    const existing = await db.doc(`projects/${projectId}`).get();
    if (existing.exists && existing.data()?.orgId !== orgId) throw new Error(`Conflicting project binding: ${projectId}`);
    if (!existing.exists) missing.push({ projectId, orgId });
  }
  if (apply) {
    for (const { projectId, orgId } of missing) {
      await db.doc(`projects/${projectId}`).create({ orgId, lifecycle: 'active' });
    }
  }
  return { inspected: bindings.size, missing: missing.length, applied: apply ? missing.length : 0 };
}

```

## `backend/public-status.ts`

```ts
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

```

## `agent.js`

```js
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

```

## `metrics-collector.js`

```js
/**
 * Nexo Cloud - Metrics Collector Script (v1.0.0)
 * 
 * This script simulates a metrics collector running on a server/container.
 * It periodically collects system metrics and sends them to the Nexo API.
 */

if (process.env.NEXO_DEMO_MODE !== 'true') {
  throw new Error('metrics-collector.js is demo-only. Set NEXO_DEMO_MODE=true to run simulated telemetry.');
}

const API_ENDPOINT = process.env.NEXO_API_URL || 'http://localhost:3000/api/metrics/ingest';
const PROJECT_ID = process.env.NEXO_PROJECT_ID || 'nexo-prod-cluster';
const RESOURCE_ID = process.env.HOSTNAME || 'node-01';

async function collectMetrics() {
  // In a real scenario, we would use 'os-utils' or 'systeminformation'
  const metrics = [
    { type: 'cpu', value: Math.random() * 100, timestamp: new Date().toISOString(), resourceId: RESOURCE_ID },
    { type: 'memory', value: Math.random() * 100, timestamp: new Date().toISOString(), resourceId: RESOURCE_ID },
    { type: 'network', value: Math.random() * 100, timestamp: new Date().toISOString(), resourceId: RESOURCE_ID },
    { type: 'disk', value: Math.random() * 100, timestamp: new Date().toISOString(), resourceId: RESOURCE_ID },
  ];

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Nexo-Token': process.env.NEXO_API_KEY || 'test-token'
      },
      body: JSON.stringify({
        projectId: PROJECT_ID,
        metrics: metrics
      })
    });

    const result = await response.json();
    console.log(`[${new Date().toISOString()}] Metrics pushed:`, result);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to push metrics:`, error.message);
  }
}

// Run every 10 seconds
console.log(`Nexo Collector started for project: ${PROJECT_ID}`);
setInterval(collectMetrics, 10000);
collectMetrics();

```

## `monitoring-agent/src/agent.js`

```js
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

const stateDir = process.env.NEXO_STATE_DIR || path.join(os.homedir(), '.nexo-cloud-agent');
const bufferFile = path.join(stateDir, 'buffer.json');
const runOnce = process.env.NEXO_RUN_ONCE === 'true';
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
    if (runOnce) throw error;
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    retryDelayMs = Math.min(retryDelayMs * 2, 60_000);
  }
}

if (runOnce) {
  void tick().catch((error) => {
    console.error(`agent failed: ${error.message}`);
    process.exitCode = 1;
  });
} else {
  setInterval(() => void tick(), config.intervalMs);
  void tick();
}

```

## `monitoring-agent/package.json`

```json
{
  "name": "@nexo-cloud/monitoring-agent",
  "version": "1.0.0",
  "private": true,
  "description": "Lightweight Nexo Cloud monitoring agent for Linux, Windows, and macOS.",
  "type": "module",
  "main": "src/agent.js",
  "scripts": {
    "start": "node src/agent.js"
  },
  "dependencies": {
    "systeminformation": "^5.27.12"
  }
}

```

## `package.json`

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "start": "tsx server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "deploy:live": "vercel --prod",
    "desktop:dev": "concurrently -k \"vite\" \"wait-on tcp:5173 && electron electron/main.cjs\"",
    "desktop:build": "npm run build && electron-builder --mac dmg",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit",
    "test": "node tests/srs-smoke.test.mjs && node --import tsx --test tests/invitation-email.test.ts",
    "test:e2e": "playwright test",
    "test:e2e:real": "firebase emulators:exec --config firebase.e2e.json --project demo-nexo-e2e --only auth,firestore 'playwright test --config playwright.real.config.ts'",
    "test:all": "npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:real"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "12.19.0",
    "firebase-admin": "^13.7.0",
    "framer-motion": "^12.38.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^3.8.0",
    "tailwind-merge": "^3.5.0",
    "three": "^0.183.2",
    "tsx": "^4.21.0",
    "vite": "^6.2.0",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "electron": "^35.1.5",
    "electron-builder": "^26.0.12",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "wait-on": "^8.0.3"
  },
  "engines": {
    "node": ">=22"
  },
  "main": "electron/main.cjs",
  "build": {
    "appId": "com.nexocloud.desktop",
    "productName": "Nexo Cloud",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "target": [
        "dmg"
      ],
      "category": "public.app-category.developer-tools"
    }
  }
}

```
