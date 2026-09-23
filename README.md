# Nexo Cloud

AI-Based Server Management System – Nexo Cloud is a React, TypeScript, Node.js, Firebase, and Vercel observability platform for monitoring servers, logs, alerts, incidents, risks, public status, teams, API keys, audit history, and estimated cloud costs.

## Architecture

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Recharts, Three.js
- Backend: Node.js, Express, TypeScript, Firebase Admin SDK
- Auth and data: Firebase Authentication and Firestore
- Email: Resend API
- Agent: Node.js monitoring agent in `monitoring-agent/`
- Deployment: Vercel for the app/API, Firebase CLI for Firestore rules

Telemetry flow:

```text
Server -> Nexo Monitoring Agent -> Secure Telemetry API -> Node/Express Backend -> Firestore -> Real-Time Nexo Dashboard
```

## Install

```bash
npm install
```

## Environment

Copy `.env.example` and fill backend secrets:

```bash
cp .env.example .env
```

Required for server-side Firebase Admin work:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_JSON`
- `RESEND_API_KEY` for email delivery

The frontend Firebase client config is in `firebase-applet-config.json` and currently points to `nexocloud-software`.

## Run

```bash
npm run dev
```

App: `http://localhost:3000`

## Build And Check

```bash
npm run lint
npm run build
npm test
```

## Automated End-to-End Testing

The fast browser suite uses a development-only synthetic owner and checks public pages, navigation, and API rejection cases:

```bash
npx playwright install chromium
npm run test:e2e
```

The real-backend suite starts isolated Firebase Auth and Firestore emulators under the demo project `demo-nexo-e2e`. On desktop and mobile it signs up through Firebase Auth, provisions a server in Firestore, runs the actual monitoring agent once, sends telemetry and logs through Express, checks alerts, incidents, public status, report CSV, key revocation and replacement, server deletion, and signs out and back in. It also exercises owner-to-viewer invitations, account-deletion protection and cleanup, and denied unauthorized invitations and Firestore access:

```bash
npm ci --prefix monitoring-agent
npm run test:e2e:real
```

Install the Firebase CLI, Java, and Chromium before running the real suite. The command starts and stops the emulators automatically. It uses fresh in-memory emulator data and does not write to the production Firebase project. To run every local gate with one command, use `npm run test:all`. CI runs the gates on every push and pull request.

These emulator tests cover the local Express server. A deployed Vercel preview, real Resend delivery, and the join-request/deep-scan routes still need separate deployed-environment verification.

## Firebase Rules

```bash
firebase deploy --only firestore:rules --project nexocloud-software
```

## Monitoring Agent

```bash
cd monitoring-agent
npm install
cp .env.example .env
NEXO_API_URL=http://localhost:3000/api/v1/telemetry \
NEXO_SERVER_ID=<server-id> \
NEXO_API_KEY=<one-time-generated-key> \
npm start
```

The agent buffers failed readings in `~/.nexo-cloud-agent/buffer.json` and retries with exponential backoff.

## Demo Data

Sign in as an admin, open `Demo Data`, and generate clearly marked demo servers and telemetry.

## Documentation

- [Architecture](docs/architecture.md)
- [Setup](docs/setup.md)
- [Firebase Setup](docs/firebase-setup.md)
- [Monitoring Agent](docs/monitoring-agent.md)
- [API Reference](docs/api-reference.md)
- [Deployment](docs/deployment.md)
- [Security](docs/security.md)
# Nexo
# Nexo
