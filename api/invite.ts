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
