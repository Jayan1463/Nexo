# Nexo Cloud

Nexo Cloud is an AI-assisted server management and observability platform for teams that need to monitor infrastructure health, collect logs, generate alerts, track incidents, and share public service status in a single dashboard.

The project combines:

- a React + TypeScript frontend for operations and analytics
- an Express backend for API endpoints and validation
- Firebase Authentication and Firestore for identity and persistence
- a Node.js monitoring agent that collects system telemetry from target servers
- support for alerts, incidents, public status pages, cost estimation, and team access control

This README explains how the project works, how to run it locally, and how to understand the codebase and deployment model.

## Overview

Nexo Cloud is designed for infrastructure and operations teams that want visibility into the health of their systems without stitching together separate monitoring, alerting, ticketing, and team-management tools.

The platform helps teams:

- monitor CPU, memory, disk, and network usage
- ingest telemetry from remote servers using API keys
- review logs and service events
- detect anomalies and raise alerts
- create incident records from critical conditions
- manage team invitations and access roles
- expose a public status page for stakeholders or customers
- estimate operational cost and risk exposure
- review audit trails and organization activity

## Product goals

The main product goals are:

1. Provide a unified operational dashboard for server health and service reliability.
2. Allow secure, authenticated telemetry ingestion from edge or server environments.
3. Turn operational data into actionable alerts and incident records.
4. Support role-based collaboration across teams and organizations.
5. Offer public transparency through service status reporting.
6. Keep the system deployable in modern cloud and hosting environments.

## Architecture

At a high level, the project follows this data flow:

```text
Server / Target machine
    -> Nexo Monitoring Agent
    -> Secure telemetry and logs API
    -> Express backend
    -> Firebase Firestore / Auth
    -> Real-time dashboard in React
```

### Core components

- Frontend: React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, Zustand, Recharts, Three.js
- Backend: Node.js, Express, TypeScript, Firebase Admin SDK
- Auth and data: Firebase Authentication and Firestore
- Email delivery: Resend API
- Monitoring agent: Node.js worker in `monitoring-agent/`
- Deployment: Azure App Service or Vercel, with Firebase CLI for Firestore rules

### Important implementation notes

The backend in `server.ts` is more than a simple API layer. It includes:

- Firebase Admin initialization
- authentication validation for protected endpoints
- API-key validation for server telemetry ingestion
- organization management and invite-code flows
- join-request handling for access approval
- alert creation and incident generation
- public status page generation
- email notifications for invites and alerts
- Vite dev server support during local development

The monitoring agent in `monitoring-agent/src/agent.js` reads system metrics from the host machine and sends them to the backend using API keys and retry buffering.

## Feature set

### 1. Authentication and workspace management

The app supports:

- sign-in via Firebase auth
- organization creation
- owners and admins managing workspaces
- membership tracking
- invite codes and join requests
- role-based access control for team members

### 2. Server monitoring

The system can track:

- server registration
- environment metadata
- status and health state
- last seen timestamps
- usage metrics
- API key lifecycle

### 3. Telemetry collection

The monitoring agent gathers:

- CPU usage
- memory utilization
- disk utilization
- network traffic
- process-level information
- service and port information
- uptime

These values are posted to the backend through `/api/v1/telemetry` and stored under project/server records.

### 4. Logging

The backend accepts log events at `/api/v1/logs` and stores them under a project log collection for review and investigation.

### 5. Alerting

The system evaluates telemetry and automatically raises alert events when thresholds are exceeded. Examples from the code include:

- CPU warning and critical thresholds
- memory warning and critical thresholds
- disk usage warnings and critical risk conditions
- cooldown rules to reduce duplicate alert storms

The alert logic is in the Express server and can trigger:

- active alert records
- incident records for critical events
- email notifications

### 6. Incident management

Critical alert situations can produce incidents with fields such as:

- title
- severity
- status
- summary
- timeline
- public visibility flag

This supports operational coordination and status reporting.

### 7. Public status page

The project includes a public status API and a UI page for exposing service health without requiring a logged-in user. This is especially valuable for customer-facing or external stakeholder transparency.

### 8. Team and RBAC

The app models teams, invites, and access control. This goes beyond base monitoring and includes:

- pending invites
- role assignment
- join requests
- approval/rejection workflows
- organization ownership and admin permissions

### 9. Cost and risk analysis

The app has dedicated pages and logic for:

- risk analysis
- cost estimation
- operational summaries
- analytics dashboards

### 10. Audit and reporting

The project supports:

- audit logs
- team change tracking
- operational reporting
- export/reporting views in the dashboard

## Technology stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Zustand
- Recharts
- Three.js
- Lucide React

### Backend

- Node.js
- Express
- TypeScript
- Firebase Admin SDK

### Data and identity

- Firebase Authentication
- Firestore

### Email and notifications

- Resend API

### Monitoring agent

- Node.js
- `systeminformation` package
- local buffered retry logic

### Desktop support

- Electron
- Electron Builder

## Project structure

```text
.
├── api/                       # API route wrappers for deployment platforms
├── backend/                  # backend logic modules
│   ├── accept-invite.ts
│   ├── database.ts
│   ├── deep-scan.ts
│   ├── delete-project.ts
│   ├── invitation-email.ts
│   ├── project-migration.ts
│   ├── public-status.ts
│   └── ...
├── docs/                     # product and technical documentation
├── electron/                 # Electron desktop app files
├── monitoring-agent/         # server telemetry collector
│   └── src/
├── release/                  # packaged desktop release artifacts
├── scripts/                  # project maintenance scripts
├── src/                      # React app source
│   ├── components/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── firebase.ts
│   ├── store.ts
│   ├── types.ts
│   └── main.tsx
├── tests/                    # automated tests
├── firebase.json             # Firebase config
├── firebase-applet-config.json
├── firebase.e2e.json         # emulator config
├── firestore.rules          # Firestore security rules
├── package.json              # project scripts and dependencies
├── server.ts                 # main Express server and API routes
├── vite.config.ts
├── tsconfig.json
├── vercel.json
├── playwright.config.ts
├── README.md
└── ...
```

## Environment setup

The project expects environment configuration before running the backend correctly.

### Install dependencies

```bash
npm install
```

### Create environment file

Copy the project environment template (if available in your repo settings) and fill in your values:

```bash
cp .env.example .env
```

### Required backend variables

The app expects variables such as:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON` or `GOOGLE_SERVICE_ACCOUNT_JSON`
- `RESEND_API_KEY`
- app URL and invite email values when relevant

The frontend Firebase client config is in `firebase-applet-config.json` and currently points to the project configured in the repo.

## Running locally

### Start the app

```bash
npm run dev
```

The app is expected to be served at:

```text
http://localhost:3000
```

### Build and validate

```bash
npm run lint
npm run build
npm test
```

### Run the browser E2E suite

```bash
npx playwright install chromium
npm run test:e2e
```

This checks high-level UI flow and access restrictions.

### Run the Firebase emulator-backed E2E suite

```bash
npm ci --prefix monitoring-agent
npm run test:e2e:real
```

This suite starts Firebase Auth and Firestore emulators, provisions a test organization and server, simulates the monitoring agent, verifies telemetry flow, checks alerts/incidents/public status behavior, tests invites, and validates access restrictions.

### Run all quality gates

```bash
npm run test:all
```

This runs linting, tests, build, and both E2E suites.

## Monitoring agent setup

The project includes a server-side monitoring agent that collects local machine metrics and posts them to the backend.

### Agent run steps

```bash
cd monitoring-agent
npm install
cp .env.example .env
NEXO_API_URL=http://localhost:3000/api/v1/telemetry \
NEXO_SERVER_ID=<server-id> \
NEXO_API_KEY=<one-time-generated-key> \
npm start
```

The agent buffers failed readings locally and retries automatically with backoff. The buffer file is stored under the user home directory in a `.nexo-cloud-agent` directory.

## API behavior

The backend routes include:

- `/api/health` – health check endpoint
- `/api/metrics` and `/api/v1/telemetry` – telemetry ingestion
- `/api/logs` and `/api/v1/logs` – log ingestion
- `/api/invite` – invite new team members
- `/api/accept-invite` – accept an invite
- `/api/org/join-request` – request organization access
- `/api/requests/approve` and `/api/requests/reject` – membership approval flows
- `/api/public-status` – public status endpoint
- `/api/deep-scan` – deeper operational analysis endpoint
- `/api/delete-project` – project cleanup
- `/api/delete-account` – account deletion and cleanup flow

The telemetry ingestion endpoints validate API keys and compute alert conditions before storing metrics.

## Security model

The project has several important security considerations:

- Firebase JWT verification for protected routes
- API-key validation for server access
- authorization checks for admin/owner routes
- Firestore rules for access boundaries
- deletion protection for account ownership scenarios
- validation for invite links and role assignment

The app is designed with the assumption that only trusted organizations and valid API keys should be able to send telemetry or modify internal records.

## Deployment

### Azure App Service

The README notes that the React frontend and Express API can run together on an Azure App Service Linux plan. The server reads Azure's assigned `PORT`, binds to `0.0.0.0`, and serves the built frontend when `NODE_ENV=production`.

### Vercel

The project includes `vercel.json` and deployment chores for Vercel-style hosting.

### Firebase rules deployment

```bash
firebase deploy --only firestore:rules --project nexocloud-software
```

## Testing

The repo includes multiple test layers:

- unit-style smoke/test validation
- Playwright browser tests
- Firebase emulator-backed E2E tests

### Smoke tests

```bash
npm test
```

### Playwright tests

```bash
npx playwright install chromium
npm run test:e2e
```

### Real-backend emulator tests

```bash
npm ci --prefix monitoring-agent
npm run test:e2e:real
```

These tests check:

- sign-up and auth flows
- organization provisioning
- server registration
- metric submission from the monitoring agent
- alerts and incidents
- public status pages
- invite flows
- role-based permission checks
- account deletion and cleanup

## Demo data

The project includes a demo-data workflow for generating clearly marked example servers and telemetry. This is useful for demos, onboarding, and testing without touching production data.

## Documentation

This repo includes supporting docs under `docs/`:

- [docs/architecture.md](docs/architecture.md)
- [docs/setup.md](docs/setup.md)
- [docs/firebase-setup.md](docs/firebase-setup.md)
- [docs/monitoring-agent.md](docs/monitoring-agent.md)
- [docs/api-reference.md](docs/api-reference.md)
- [docs/deployment.md](docs/deployment.md)
- [docs/security.md](docs/security.md)

## Notes for maintainers

- The app is organized around organization-level safety and access boundaries.
- Telemetry data is central to the product and is the primary source for dashboard insights.
- Most operational logic is split between the backend and the monitoring agent.
- Firestore and role logic should be treated as part of the product's security boundary.
- Monitoring thresholds and alert policies are configurable in server code and should be reviewed before production use.

## Summary

Nexo Cloud is a practical operations platform focused on visibility, automation, and service reliability. It combines monitoring, alerting, logs, team access control, and public status reporting to provide a single dashboard for infrastructure health management.

It is well suited for teams that need a lightweight but full-featured monitoring solution with real-time telemetry, clear role management, and deployment support across modern cloud and app-hosting environments.
