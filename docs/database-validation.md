# Database changes and deployment

Nexo uses Firebase Auth for identity and Firestore for organizations, membership,
projects, servers, telemetry, logs, incidents, preferences, and audit history.
Browser writes are checked by Firestore rules. Admin SDK writes bypass those rules,
so API handlers independently verify identity, organization membership, and roles.

## Project ownership

`projects/{projectId}` is the authoritative ownership record:

```json
{ "orgId": "organization-id", "lifecycle": "active" }
```

Project creation atomically writes this record and
`organizations/{orgId}/projects/{projectId}`. Project IDs cannot be claimed by
another organization. User profile fields such as `role` and `currentOrgId` do not
grant database access.

Project deletion uses `/api/delete-project`, requires an owner or admin, and
protects the last project. It marks the project as deleting, blocks new client
and ingestion writes, recursively deletes servers and their descendants and all
project subcollections, and removes the organization project entry. A minimal
ownership tombstone remains to support retries and prevent ID reuse. A failed
cleanup can be resumed by sending the same request.

## Access policy

| Action | Viewer | Developer | Admin / owner |
| --- | --- | --- | --- |
| Read workspace monitoring data | Yes | Yes | Yes |
| Run a scan on workspace telemetry | Yes | Yes | Yes |
| Operate alerts, incidents, risk insights, alert rules | No | Yes | Yes |
| Provision or terminate servers; rotate keys; publish status | No | No | Yes |
| Manage projects and non-owner memberships | No | No | Yes |
| Change ownership through a client write | No | No | No |
| Write telemetry directly from a browser | No | No | No |

Invitations are created and accepted through authenticated APIs. Clients cannot
edit the invitation role or token. Member display profiles live in membership
documents; private user documents remain readable only by their own users.

Public status reads `/api/public-status`, which returns an explicit field allowlist.
Anonymous Firestore reads of server and incident documents are denied. Public
responses exclude API-key hashes, host information, telemetry, member IDs, and
incident timelines. Automatically generated incident titles use the public name.

## Existing database migration

New rules require ownership records for existing projects. Deploying the rules
before migrating existing data will block access to those projects.

1. Back up the intended database and pause project creation during migration.
2. Configure ignored Firebase Admin credentials and explicitly select the project.
3. Inspect the migration without writing:

   ```sh
   FIREBASE_PROJECT_ID=your-staging-project node --import tsx scripts/migrate-project-bindings.ts
   ```

4. Review the target and migration count, then apply to that same database:

   ```sh
   FIREBASE_PROJECT_ID=your-staging-project node --import tsx scripts/migrate-project-bindings.ts --apply --confirm-project=your-staging-project
   ```

5. Deploy the API and frontend changes together with `firestore.rules` in a
   maintenance window. Verify staging signup, invitations, telemetry, status, and
   deletion before repeating the process in production.

The migration refuses conflicting or duplicate ownership bindings. It adds
ownership records; it does not delete or rewrite telemetry. Credentials may be
provided through an ignored service-account file path or application credentials.

## Verification

`npm run test:all` runs type checking, smoke tests, production build, browser shell
tests, and Firebase emulator integration tests. The browser suites use dedicated
ports 3130 and 3131. Auth and Firestore emulators use ports 19099 and 18080.

The database tests exercise direct client permission denials, role escalation,
cross-organization project claims, anonymous document access, sanitized public
responses, authenticated scans, and recursive cleanup of more than 500 records.
Other integration tests exercise UI signup, invitations, live agent ingestion,
alerts, incidents, key rotation, and account deletion.

Local emulator success is not evidence that production rules, indexes, or API
configuration are deployed correctly. This change does not deploy or migrate the
production database. Real email delivery and deployed workflows require staging
verification.
