# Architecture

Nexo Cloud uses a React/Vite frontend, an Express backend, Firebase Authentication, Firestore realtime listeners, Firebase Admin SDK privileged API routes, and a Node.js monitoring agent.

Telemetry flow:

Server -> Nexo Monitoring Agent -> `/api/v1/telemetry` -> Express/Admin validation -> Firestore -> realtime dashboard listeners.

Core modules:

- Auth and organization bootstrap
- Server provisioning and hashed API keys
- Telemetry and log ingestion
- Alert evaluation and incident escalation
- Risk insight generation
- Cost estimation
- Public status page
- Team, reports, audit logs, and documentation
