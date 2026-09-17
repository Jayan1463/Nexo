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
    await logRef.set({
      id: logRef.id,
      serverId,
      projectId,
      level: normalizedLevel,
      message: message.trim(),
      service: service.trim(),
      timestamp: timestamp || new Date().toISOString(),
    });

    return res.status(200).json({ success: true, logId: logRef.id });
  } catch (error) {
    console.error("Logs ingest failed:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
