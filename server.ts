import acceptInvite from './backend/accept-invite';
import deepScan from './backend/deep-scan';
import deleteProject from './backend/delete-project';
import publicStatus from './backend/public-status';
import { activeServerWrite, HttpError } from './backend/database';
import express from "express";
import { createServer as createViteServer } from "vite";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";
import dotenv from "dotenv";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

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

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = parseServiceAccount();
  if (serviceAccount) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    });
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId,
    });
  }
}

const getDb = () => {
  const app = admin.app();
  const dbId = process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
  if (dbId) {
    return getFirestore(app, dbId);
  }
  return getFirestore(app);
};

function isMissingGoogleCredentials(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Could not load the default credentials");
}

function sendApiError(res: express.Response, error: unknown, context: string) {
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error(`Error in ${context}:`, error);
  if (isMissingGoogleCredentials(error)) {
    return res.status(503).json({
      error: "Firebase Admin credentials are not configured on this server.",
    });
  }
  return res.status(500).json({ error: "Internal server error" });
}

function makeInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function hashApiKey(apiKey: string) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

async function findServerByApiKey(db: FirebaseFirestore.Firestore, apiKey: string) {
  const apiKeyHash = hashApiKey(apiKey);
  const hashedMatch = await db.collection("servers")
    .where("apiKeyHash", "==", apiKeyHash)
    .where("apiKeyStatus", "==", "active")
    .limit(1)
    .get();
  if (!hashedMatch.empty) return hashedMatch.docs[0];

  const legacyMatch = await db.collection("servers").where("apiKey", "==", apiKey).limit(1).get();
  const legacyDoc = legacyMatch.docs[0];
  if (!legacyDoc || legacyDoc.data().apiKeyStatus === "revoked") return null;
  return legacyDoc;
}

function normalizeNumber(value: unknown, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

async function ensureUniqueInviteCode(db: FirebaseFirestore.Firestore): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const inviteCode = makeInviteCode();
    const existing = await db.collection("organizations").where("inviteCode", "==", inviteCode).limit(1).get();
    if (existing.empty) return inviteCode;
  }
  return crypto.randomBytes(6).toString("hex").toUpperCase();
}

async function deleteDocs(
  db: FirebaseFirestore.Firestore,
  docs: FirebaseFirestore.QueryDocumentSnapshot[],
) {
  if (docs.length === 0) return;
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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);
  const db = getDb();

  app.use(express.json());

  const requireAuth = async (req: express.Request, res: express.Response): Promise<admin.auth.DecodedIdToken | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }
    try {
      const token = authHeader.split(" ")[1];
      return await admin.auth().verifyIdToken(token);
    } catch {
      res.status(401).json({ error: "Invalid token" });
      return null;
    }
  };

  const sendEmail = async (to: string[], subject: string, text: string) => {
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.INVITE_FROM_EMAIL || "Nexo Cloud <onboarding@resend.dev>";
    if (resendKey) {
      const resendResp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from: fromEmail, to, subject, text }),
      });
      if (!resendResp.ok) {
        const body = await resendResp.text();
        throw new Error(`Email delivery failed: ${body}`);
      }
      return;
    }
    const emailRef = db.collection("sent_emails").doc();
    await emailRef.set({
      id: emailRef.id,
      to,
      subject,
      text,
      createdAt: new Date().toISOString(),
    });
  };

  const addGithubCollaborator = async (username: string) => {
    const token = process.env.GITHUB_PAT;
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (!token || !owner || !repo) {
      throw new Error("GitHub integration not configured. Set GITHUB_PAT, GITHUB_OWNER, and GITHUB_REPO.");
    }
    const url = `https://api.github.com/repos/${owner}/${repo}/collaborators/${encodeURIComponent(username)}`;
    let lastError = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const resp = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permission: "push" }),
      });
      if (resp.ok) return;
      lastError = await resp.text();
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 300 * attempt));
      }
    }
    throw new Error(`GitHub collaborator add failed: ${lastError}`);
  };

  const defaultAlertRules = {
    cpuWarning: 90,
    cpuCritical: 95,
    memoryWarning: 90,
    memoryCritical: 95,
    cooldownMinutes: 15,
    emailEnabled: true,
    pushEnabled: true,
  };

  const getAlertRules = async (projectId: string) => {
    const rulesSnap = await db.collection("projects").doc(projectId).collection("alert_rules").doc("default").get();
    if (!rulesSnap.exists) return defaultAlertRules;
    const data = rulesSnap.data() || {};
    return {
      cpuWarning: Number(data.cpuWarning ?? defaultAlertRules.cpuWarning),
      cpuCritical: Number(data.cpuCritical ?? defaultAlertRules.cpuCritical),
      memoryWarning: Number(data.memoryWarning ?? defaultAlertRules.memoryWarning),
      memoryCritical: Number(data.memoryCritical ?? defaultAlertRules.memoryCritical),
      cooldownMinutes: Number(data.cooldownMinutes ?? defaultAlertRules.cooldownMinutes),
      emailEnabled: Boolean(data.emailEnabled ?? defaultAlertRules.emailEnabled),
      pushEnabled: Boolean(data.pushEnabled ?? defaultAlertRules.pushEnabled),
    };
  };

  const sendAlertEmails = async (projectId: string, alert: Record<string, unknown>) => {
    const projectMatch = await db.collectionGroup("projects").where("id", "==", projectId).limit(1).get();
    if (projectMatch.empty) return;
    const projectDoc = projectMatch.docs[0];
    const orgRef = projectDoc.ref.parent.parent;
    const orgId = orgRef?.id;
    if (!orgId) return;

    const membersSnap = await db.collection(`organizations/${orgId}/members`).get();
    if (membersSnap.empty) return;

    const recipientEmails: string[] = [];
    for (const member of membersSnap.docs) {
      const memberData = member.data();
      const uid = String(memberData.uid || member.id);
      const userSnap = await db.collection("users").doc(uid).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data() || {};
      const email = String(userData.email || "").trim().toLowerCase();
      const emailEnabled = userData.notificationPreferences?.email !== false;
      if (email && emailEnabled) {
        recipientEmails.push(email);
      }
    }
    const uniqueRecipients = Array.from(new Set(recipientEmails));
    if (!uniqueRecipients.length) return;

    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL || process.env.INVITE_FROM_EMAIL || "Nexo Cloud <onboarding@resend.dev>";
    const subject = `[Nexo Alert] ${String(alert.severity || "warning").toUpperCase()} - ${String(alert.alertType || "resource")}`;
    const text = `${String(alert.message || "Alert triggered")}\n\nProject: ${projectId}\nServer: ${String(alert.serverId || "unknown")}\nTime: ${String(alert.timestamp || new Date().toISOString())}`;

    if (resendKey) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: uniqueRecipients,
          subject,
          text,
        }),
      });
      return;
    }

    const emailRef = db.collection("sent_emails").doc();
    await emailRef.set({
      id: emailRef.id,
      to: uniqueRecipients,
      subject,
      text,
      context: "alert_notification",
      createdAt: new Date().toISOString(),
    });
  };

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/org/join-request", async (req, res) => {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;

    const uid = decoded.uid;
    const email = String(decoded.email || "").trim().toLowerCase();
    const { inviteCode, requestedRole, githubUsername } = req.body || {};
    const role = requestedRole === "viewer" || requestedRole === "developer" || requestedRole === "admin" ? requestedRole : null;
    if (!inviteCode || typeof inviteCode !== "string" || !role) {
      return res.status(400).json({ error: "inviteCode and requestedRole are required" });
    }

    try {
      const invite = String(inviteCode).trim().toUpperCase();
      const orgSnap = await db.collection("organizations").where("inviteCode", "==", invite).limit(1).get();
      if (orgSnap.empty) {
        return res.status(404).json({ error: "Invalid invite code" });
      }

      const orgDoc = orgSnap.docs[0];
      const orgId = orgDoc.id;
      const orgData = orgDoc.data();
      const userRef = db.collection("users").doc(uid);
      const userSnap = await userRef.get();
      const currentOrgId = String(userSnap.data()?.currentOrgId || userSnap.data()?.orgId || "");
      if (currentOrgId && currentOrgId === orgId) {
        return res.status(409).json({ error: "You are already in this organization" });
      }

      const dupSnap = await db.collection("joinRequests")
        .where("userId", "==", uid)
        .where("orgId", "==", orgId)
        .where("status", "==", "pending")
        .limit(1)
        .get();
      if (!dupSnap.empty) {
        return res.status(409).json({ error: "A pending request already exists for this organization" });
      }

      const reqRef = db.collection("joinRequests").doc();
      const payload = {
        id: reqRef.id,
        userId: uid,
        userEmail: email,
        orgId,
        orgName: String(orgData.name || "Organization"),
        requestedRole: role,
        githubUsername: role === "developer" ? String(githubUsername || "").trim() : "",
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      if (role === "developer" && !payload.githubUsername) {
        return res.status(400).json({ error: "GitHub username is required for developer access" });
      }
      await reqRef.set(payload);

      const ownerId = String(orgData.ownerId || "");
      if (ownerId) {
        const notificationRef = db.collection("notifications").doc();
        await notificationRef.set({
          id: notificationRef.id,
          orgId,
          recipientUserId: ownerId,
          type: "join_request",
          requestId: reqRef.id,
          title: "New join request",
          message: `${email} requested ${role} access to ${payload.orgName}.`,
          read: false,
          createdAt: new Date().toISOString(),
        });

        const ownerUserSnap = await db.collection("users").doc(ownerId).get();
        const ownerEmail = String(ownerUserSnap.data()?.email || "").trim().toLowerCase();
        if (ownerEmail) {
          const appUrl = process.env.APP_URL || "http://localhost:3000";
          const approveLink = `${appUrl}/?tab=approvals&requestId=${reqRef.id}&action=approve`;
          const rejectLink = `${appUrl}/?tab=approvals&requestId=${reqRef.id}&action=reject`;
          await sendEmail(
            [ownerEmail],
            `Join request for ${payload.orgName}`,
            `User ${email} requested role "${role}" for ${payload.orgName}.\n\nApprove: ${approveLink}\nReject: ${rejectLink}\n\nRequest ID: ${reqRef.id}`
          );
        }
      }

      res.json({ success: true, requestId: reqRef.id, orgId, status: "pending" });
    } catch (error) {
      return sendApiError(res, error, "org/join-request");
    }
  });

  app.post("/api/org/invite-code/regenerate", async (req, res) => {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const userId = decoded.uid;
    const { orgId } = req.body || {};
    if (!orgId || typeof orgId !== "string") {
      return res.status(400).json({ error: "orgId is required" });
    }
    try {
      const orgRef = db.collection("organizations").doc(orgId);
      const orgSnap = await orgRef.get();
      if (!orgSnap.exists) return res.status(404).json({ error: "Organization not found" });
      const orgData = orgSnap.data() as any;

      const memberSnap = await db.collection(`organizations/${orgId}/members`).doc(userId).get();
      const memberRole = String(memberSnap.data()?.role || "");
      const isAllowed = userId === String(orgData.ownerId || "") || memberRole === "admin";
      if (!isAllowed) return res.status(403).json({ error: "Only owner/admin can regenerate invite code" });

      const inviteCode = await ensureUniqueInviteCode(db);
      await orgRef.set({
        inviteCode,
        inviteCodeUpdatedAt: new Date().toISOString(),
        inviteCodeUpdatedBy: userId,
      }, { merge: true });

      res.json({ success: true, orgId, inviteCode });
    } catch (error) {
      return sendApiError(res, error, "org/invite-code/regenerate");
    }
  });

  app.post("/api/requests/approve", async (req, res) => {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const approverId = decoded.uid;
    const { requestId } = req.body || {};
    if (!requestId || typeof requestId !== "string") {
      return res.status(400).json({ error: "requestId is required" });
    }

    try {
      const reqRef = db.collection("joinRequests").doc(requestId);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return res.status(404).json({ error: "Request not found" });
      const joinRequest = reqSnap.data() as any;
      if (joinRequest.status !== "pending") return res.status(409).json({ error: "Request already processed" });

      const orgId = String(joinRequest.orgId || "");
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      if (!orgSnap.exists) return res.status(404).json({ error: "Organization not found" });
      const orgData = orgSnap.data() as any;

      const approverMemberSnap = await db.collection(`organizations/${orgId}/members`).doc(approverId).get();
      const approverRole = String(approverMemberSnap.data()?.role || "");
      const isAuthorized = approverId === orgData.ownerId || approverRole === "admin";
      if (!isAuthorized) return res.status(403).json({ error: "Only owner/admin can approve requests" });

      const approvedRole = String(joinRequest.requestedRole || "viewer");
      const userId = String(joinRequest.userId);
      await reqRef.update({
        status: "approved",
        approvedBy: approverId,
        approvedAt: new Date().toISOString(),
      });

      await db.collection("users").doc(userId).set({
        orgId,
        currentOrgId: orgId,
        role: approvedRole,
        orgIds: admin.firestore.FieldValue.arrayUnion(orgId),
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      await db.collection(`organizations/${orgId}/members`).doc(userId).set({
        uid: userId,
        role: approvedRole,
        joinedAt: new Date().toISOString(),
      }, { merge: true });

      if (approvedRole === "developer") {
        await addGithubCollaborator(String(joinRequest.githubUsername || ""));
      }

      const notificationRef = db.collection("notifications").doc();
      await notificationRef.set({
        id: notificationRef.id,
        orgId,
        recipientUserId: userId,
        type: "join_request_approved",
        requestId,
        title: "Access approved",
        message: `Your ${approvedRole} access request for ${String(orgData.name || "organization")} was approved.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      const requesterEmail = String(joinRequest.userEmail || "").trim().toLowerCase();
      if (requesterEmail) {
        await sendEmail(
          [requesterEmail],
          `Access approved for ${String(orgData.name || "Nexo Cloud")}`,
          `Your join request has been approved.\n\nOrganization: ${String(orgData.name || "")}\nRole: ${approvedRole}`
        );
      }

      res.json({ success: true });
    } catch (error) {
      return sendApiError(res, error, "requests/approve");
    }
  });

  app.post("/api/requests/reject", async (req, res) => {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const reviewerId = decoded.uid;
    const { requestId } = req.body || {};
    if (!requestId || typeof requestId !== "string") {
      return res.status(400).json({ error: "requestId is required" });
    }

    try {
      const reqRef = db.collection("joinRequests").doc(requestId);
      const reqSnap = await reqRef.get();
      if (!reqSnap.exists) return res.status(404).json({ error: "Request not found" });
      const joinRequest = reqSnap.data() as any;
      if (joinRequest.status !== "pending") return res.status(409).json({ error: "Request already processed" });

      const orgId = String(joinRequest.orgId || "");
      const orgSnap = await db.collection("organizations").doc(orgId).get();
      if (!orgSnap.exists) return res.status(404).json({ error: "Organization not found" });
      const orgData = orgSnap.data() as any;

      const reviewerMemberSnap = await db.collection(`organizations/${orgId}/members`).doc(reviewerId).get();
      const reviewerRole = String(reviewerMemberSnap.data()?.role || "");
      const isAuthorized = reviewerId === orgData.ownerId || reviewerRole === "admin";
      if (!isAuthorized) return res.status(403).json({ error: "Only owner/admin can reject requests" });

      await reqRef.update({
        status: "rejected",
        rejectedBy: reviewerId,
        rejectedAt: new Date().toISOString(),
      });

      const notificationRef = db.collection("notifications").doc();
      await notificationRef.set({
        id: notificationRef.id,
        orgId,
        recipientUserId: String(joinRequest.userId || ""),
        type: "join_request_rejected",
        requestId,
        title: "Access request rejected",
        message: `Your request to join ${String(orgData.name || "organization")} was rejected.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

      const requesterEmail = String(joinRequest.userEmail || "").trim().toLowerCase();
      if (requesterEmail) {
        await sendEmail(
          [requesterEmail],
          `Access request update for ${String(orgData.name || "Nexo Cloud")}`,
          `Your join request has been rejected.\n\nOrganization: ${String(orgData.name || "")}`
        );
      }

      res.json({ success: true });
    } catch (error) {
      return sendApiError(res, error, "requests/reject");
    }
  });

  // Real Server Metrics Ingestion Endpoint
  app.post(["/api/metrics", "/api/v1/telemetry", "/api/v1/events"], async (req, res) => {
    const headerKey = typeof req.headers["x-nexo-api-key"] === "string" ? req.headers["x-nexo-api-key"] : "";
    const authHeader = req.headers.authorization;
    if (!headerKey && (!authHeader || !authHeader.startsWith("Bearer "))) {
      return res.status(401).json({ error: "Unauthorized: Missing or invalid API key" });
    }

    const apiKey = headerKey || String(authHeader?.split(" ")[1] || "");
    const { cpu, memory, network, disk, uptime, timestamp, processes, ports, services } = req.body;
    const cpuValue = Number(cpu);
    const memoryValue = Number(memory);
    const networkValue = Number(network);
    const diskValue = normalizeNumber(disk, 0);
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
      // 1. Validate API Key and find server
      const serverDoc = await findServerByApiKey(db, apiKey);
      if (!serverDoc) {
        return res.status(401).json({ error: "Unauthorized: Invalid API key" });
      }

      const serverData = serverDoc.data();
      const serverId = serverDoc.id;
      const projectId = serverData.projectId;
      const nextStatus = cpuValue >= 90 || memoryValue >= 90 || diskValue >= 90 ? "degraded" : "online";

      // 3. Store metric
      const metricRef = serverDoc.ref.collection("metrics").doc();
      const metricData = {
        id: metricRef.id,
        serverId,
        projectId,
        cpu: cpuValue,
        memory: memoryValue,
        network: networkValue,
        disk: diskValue,
        uptime: normalizeNumber(uptime, 0),
        processes: Array.isArray(processes) ? processes.slice(0, 100) : [],
        ports: Array.isArray(ports) ? ports.slice(0, 100) : [],
        services: Array.isArray(services) ? services.slice(0, 100) : [],
        timestamp: timestamp || new Date().toISOString()
      };
      await activeServerWrite(db, serverId, (tx) => {
      tx.update(serverDoc.ref, {
        lastSeen: admin.firestore.FieldValue.serverTimestamp(),
        status: nextStatus,
        apiKeyLastUsed: admin.firestore.FieldValue.serverTimestamp(),
      });

        tx.set(metricRef, metricData);
      });

      // 4. Anomaly Detection & Alerting
      const rules = await getAlertRules(projectId);
      const pendingAlerts: Array<{ alertType: "cpu" | "memory" | "disk" | "network" | "availability" | "security"; severity: "warning" | "critical"; message: string }> = [];

      if (cpuValue >= rules.cpuCritical) {
        pendingAlerts.push({
          alertType: "cpu",
          severity: "critical",
          message: `High CPU detected on ${serverData.name}: ${cpuValue.toFixed(1)}%`,
        });
      } else if (cpuValue >= rules.cpuWarning) {
        pendingAlerts.push({
          alertType: "cpu",
          severity: "warning",
          message: `Elevated CPU detected on ${serverData.name}: ${cpuValue.toFixed(1)}%`,
        });
      }

      if (memoryValue >= rules.memoryCritical) {
        pendingAlerts.push({
          alertType: "memory",
          severity: "critical",
          message: `High Memory detected on ${serverData.name}: ${memoryValue.toFixed(1)}%`,
        });
      } else if (memoryValue >= rules.memoryWarning) {
        pendingAlerts.push({
          alertType: "memory",
          severity: "warning",
          message: `Elevated Memory detected on ${serverData.name}: ${memoryValue.toFixed(1)}%`,
        });
      }

      if (diskValue >= 95) {
        pendingAlerts.push({
          alertType: "disk",
          severity: "critical",
          message: `Disk capacity risk detected on ${serverData.name}: ${diskValue.toFixed(1)}%`,
        });
      } else if (diskValue >= 90) {
        pendingAlerts.push({
          alertType: "disk",
          severity: "warning",
          message: `Disk usage elevated on ${serverData.name}: ${diskValue.toFixed(1)}%`,
        });
      }

      for (const candidate of pendingAlerts) {
        const recentAlertsSnap = await db.collection("projects").doc(projectId).collection("alerts")
          .where("serverId", "==", serverId)
          .where("status", "==", "active")
          .limit(50)
          .get();

        const cooldownMs = Math.max(1, rules.cooldownMinutes) * 60 * 1000;
        const now = Date.now();
        const inCooldown = recentAlertsSnap.docs.some((docSnap) => {
          const data = docSnap.data();
          if (data.alertType !== candidate.alertType) return false;
          const ts = new Date(String(data.timestamp || 0)).getTime();
          return Number.isFinite(ts) && now - ts < cooldownMs;
        });
        if (inCooldown) continue;

        const alertRef = db.collection("projects").doc(projectId).collection("alerts").doc();
        const alertPayload = {
          id: alertRef.id,
          projectId,
          serverId,
          alertType: candidate.alertType,
          severity: candidate.severity,
          message: candidate.message,
          status: "active",
          timestamp: new Date().toISOString(),
        };
        await activeServerWrite(db, serverId, (tx) => tx.set(alertRef, alertPayload));

        if (candidate.severity === "critical") {
          const incidentRef = db.collection("projects").doc(projectId).collection("incidents").doc();
          const nowIso = new Date().toISOString();
          await activeServerWrite(db, serverId, (tx) => tx.set(incidentRef, {
            id: incidentRef.id,
            projectId,
            serverId,
            title: candidate.message,
            status: "investigating",
            severity: candidate.severity,
            summary: "Auto-created from a critical telemetry alert.",
            sourceAlertId: alertRef.id,
            publicVisible: Boolean(serverData.publicStatusEnabled),
            timeline: [{
              status: "investigating",
              message: "Incident opened automatically after critical threshold breach.",
              timestamp: nowIso,
            }],
            createdAt: nowIso,
            updatedAt: nowIso,
          }));
        }

        if (rules.emailEnabled) {
          await sendAlertEmails(projectId, alertPayload);
        }
      }

      res.json({ success: true, serverId });
    } catch (error) {
      return sendApiError(res, error, "metrics ingestion");
    }
  });

  // Real Server Logs Ingestion Endpoint
  app.post(["/api/logs", "/api/v1/logs"], async (req, res) => {
    const headerKey = typeof req.headers["x-nexo-api-key"] === "string" ? req.headers["x-nexo-api-key"] : "";
    const authHeader = req.headers.authorization;
    if (!headerKey && (!authHeader || !authHeader.startsWith("Bearer "))) {
      return res.status(401).json({ error: "Unauthorized: Missing or invalid API key" });
    }

    const apiKey = headerKey || String(authHeader?.split(" ")[1] || "");
    const { level, message, service, timestamp } = req.body;
    const normalizedLevel = level === "info" || level === "warn" || level === "error" ? level : "info";
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    if (typeof service !== "string" || !service.trim()) {
      return res.status(400).json({ error: "service is required" });
    }

    try {
      // 1. Validate API Key and find server
      const serverDoc = await findServerByApiKey(db, apiKey);
      if (!serverDoc) {
        return res.status(401).json({ error: "Unauthorized: Invalid API key" });
      }

      const serverData = serverDoc.data();
      const serverId = serverDoc.id;
      const projectId = serverData.projectId;

      // 2. Store log
      const logRef = db.collection("projects").doc(projectId).collection("logs").doc();
      const logData = {
        id: logRef.id,
        serverId,
        projectId,
        level: normalizedLevel,
        message: message.trim(),
        service: service.trim(),
        timestamp: timestamp || new Date().toISOString()
      };
      await activeServerWrite(db, serverId, (tx) => tx.set(logRef, logData));

      res.json({ success: true, logId: logRef.id });
    } catch (error) {
      return sendApiError(res, error, "logs ingestion");
    }
  });

  // Email Invitation Endpoint
  app.post("/api/invite", async (req, res) => {
    const decoded = await requireAuth(req, res);
    if (!decoded) return;
    const { email, orgId, role } = req.body || {};
    if (!email || !orgId) {
      return res.status(400).json({ error: "Email and orgId are required" });
    }

    try {
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
      const normalizedRole = role === "admin" || role === "developer" || role === "viewer" ? role : "viewer";
      const token = crypto.randomBytes(24).toString("hex");
      const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
      const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() || req.headers.host;
      const protocol = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
      const appUrl = (process.env.APP_URL || `${protocol}://${host || "localhost:3000"}`).replace(/\/$/, "");

      // 1. Create invite in Firestore
      const inviteRef = db.collection("organizations").doc(orgId).collection("invites").doc();
      const inviteLink = `${appUrl}/accept-invite?orgId=${encodeURIComponent(orgId)}&inviteId=${encodeURIComponent(inviteRef.id)}&token=${encodeURIComponent(token)}`;
      const inviteData = {
        id: inviteRef.id,
        email: normalizedEmail,
        orgId,
        role: normalizedRole,
        invitedBy: decoded.uid,
        status: 'pending',
        inviteToken: token,
        inviteLink,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      await inviteRef.set(inviteData);

      // 2. Send email via Resend when configured
      const orgName = orgSnap.data()?.name || "your organization";
      const fromEmail = process.env.INVITE_FROM_EMAIL || "Nexo Cloud <onboarding@resend.dev>";
      const resendApiKey = process.env.RESEND_API_KEY;
      const subject = `You're invited to join ${orgName} on Nexo Cloud`;
      const body = `You were invited to join ${orgName} as ${normalizedRole}.\n\nAccept invite: ${inviteLink}\n\nIf you don't recognize this invite, you can ignore this email.`;

      if (resendApiKey) {
        try {
          const resendResp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
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
            console.error("Resend send failed", resendResp.status, await resendResp.text());
            return res.json({ success: true, inviteId: inviteRef.id, inviteLink });
          }
        } catch (error) {
          console.error("Resend send failed", error);
          return res.json({ success: true, inviteId: inviteRef.id, inviteLink });
        }
      }

      const responsePayload: Record<string, unknown> = { success: true, inviteId: inviteRef.id };
      if (!resendApiKey) {
        responsePayload.inviteLink = inviteLink;
      }
      res.json(responsePayload);
    } catch (error) {
      return sendApiError(res, error, "invite");
    }
  });

  app.post('/api/accept-invite', acceptInvite);

  app.post("/api/delete-account", async (req, res) => {
    try {
      const authHeader = req.headers.authorization || "";
      if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const idToken = authHeader.slice("Bearer ".length).trim();
      const decoded = await admin.auth().verifyIdToken(idToken);
      const uid = decoded.uid;
      const email = String(decoded.email || "").trim().toLowerCase();

      const ownedOrgsSnap = await db.collection("organizations").where("ownerId", "==", uid).limit(1).get();
      if (!ownedOrgsSnap.empty) {
        return res.status(409).json({
          error: "You own an organization. Transfer ownership before deleting your account.",
        });
      }

      const memberDocs = await db.collectionGroup("members").where("uid", "==", uid).get();
      await deleteDocs(db, memberDocs.docs);

      const invitedByDocs = await db.collectionGroup("invites").where("invitedBy", "==", uid).get();
      await deleteDocs(db, invitedByDocs.docs);

      if (email) {
        const inviteDocsByEmail = await db.collectionGroup("invites").where("email", "==", email).get();
        const pendingInviteDocs = inviteDocsByEmail.docs.filter((docSnap) => docSnap.data().status === "pending");
        await deleteDocs(db, pendingInviteDocs);
      }

      await db.collection("users").doc(uid).delete().catch(() => undefined);
      await admin.auth().deleteUser(uid);

      return res.status(200).json({ success: true });
    } catch (error) {
      return sendApiError(res, error, "delete account");
    }
  });

  // Legacy Metrics Ingestion Endpoint (Simulated)
  app.post("/api/metrics/ingest", (req, res) => {
    if (process.env.NEXO_DEMO_MODE !== "true") {
      return res.status(410).json({
        error: "Legacy simulated ingestion is disabled. Use /api/v1/telemetry with X-Nexo-API-Key.",
      });
    }
    const { projectId, metrics } = req.body;
    console.log(`Ingesting metrics for project ${projectId}:`, metrics);
    
    // Simulate anomaly detection
    const anomalies = metrics.filter((m: any) => m.value > 90).map((m: any) => ({
      ...m,
      isAnomaly: true,
      anomalyScore: 95
    }));

    res.json({ 
      success: true, 
      ingestedCount: metrics.length,
      anomaliesDetected: anomalies.length 
    });
  });

  app.post('/api/deep-scan', deepScan);
  app.post('/api/delete-project', deleteProject);
  app.get('/api/public-status', publicStatus);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, ...(process.env.NEXO_E2E === 'true' ? { hmr: false } : {}) },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
