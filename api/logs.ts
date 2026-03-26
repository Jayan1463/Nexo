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
    const serverSnap = await db.collection("servers").where("apiKey", "==", apiKey).limit(1).get();
    if (serverSnap.empty) {
      return res.status(401).json({ error: "Unauthorized: Invalid API key" });
    }
    const serverDoc = serverSnap.docs[0];
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
