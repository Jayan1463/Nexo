# Security

Implemented controls:

- Firebase Authentication
- Firestore rules for org/project/server scoping
- React route/component RBAC
- Express/Admin token verification for privileged APIs
- API keys stored as SHA-256 hashes
- Revoked API keys rejected
- Audit logs for administrative actions
- Public status page only reads explicitly public service/incident records
- No Firebase Admin credentials in frontend code

Operational reminders:

- Keep `.env` out of git.
- Use verified Resend sending domains.
- Rotate service accounts if exposed.
- Deploy updated Firestore rules after schema changes.
