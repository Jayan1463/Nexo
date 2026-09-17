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

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, orgId, role, invitedBy } = req.body || {};
  if (!email || !orgId) {
    return res.status(400).json({ error: "Email and orgId are required" });
  }
  if (!invitedBy || typeof invitedBy !== "string") {
    return res.status(400).json({ error: "invitedBy is required" });
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return res.status(503).json({
      error: "Firebase Admin credentials missing. Set FIREBASE_SERVICE_ACCOUNT_JSON in Vercel env.",
    });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return res.status(503).json({ error: "Email provider not configured. Set RESEND_API_KEY in Vercel env." });
  }

  try {
    const db = getDb();
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
      invitedBy,
      status: "pending",
      inviteToken: token,
      inviteLink,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const orgSnap = await db.collection("organizations").doc(orgId).get();
    const orgName = orgSnap.exists ? (orgSnap.data()?.name || "your organization") : "your organization";
    const fromEmail = process.env.INVITE_FROM_EMAIL || "Nexo Cloud <onboarding@resend.dev>";
    const subject = `You're invited to join ${orgName} on Nexo Cloud`;
    const body = `You were invited to join ${orgName} as ${normalizedRole}.\n\nAccept invite: ${inviteLink}\n\nIf you don't recognize this invite, you can ignore this email.`;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [normalizedEmail],
        subject,
        text: body,
      }),
    });

    if (!resendResp.ok) {
      const resendError = await resendResp.text();
      console.error("Resend send failed", resendResp.status, resendError);
      return res.status(502).json({ error: "Invite created, but failed to send email. Check Resend sender/domain config." });
    }

    return res.status(200).json({ success: true, inviteId: inviteRef.id });
  } catch (error) {
    console.error("Error sending invite:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
