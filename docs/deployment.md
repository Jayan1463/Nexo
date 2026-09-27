# Deployment

## Azure App Service

Nexo can run as one Node.js 22 application on Azure App Service for Linux. The
Express process serves both the API and the compiled React application.

Create an App Service with these settings:

- Runtime: Node.js 22 LTS on Linux
- Startup command: `npm start`
- Build command: `npm run build`
- Health check path: `/api/health`
- Always On: enabled for production plans

Configure these App Service application settings:

- `NODE_ENV=production`
- `SCM_DO_BUILD_DURING_DEPLOYMENT=true`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_DATABASE_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `APP_URL=https://<app-name>.azurewebsites.net`
- `PUBLIC_STATUS_PROJECT_ID` for the login-free `/status` page

`FIREBASE_SERVICE_ACCOUNT_JSON` may contain the service-account JSON itself.
Do not configure it with a local file path because that file will not exist in
App Service. Store production secrets in App Service settings or reference an
Azure Key Vault secret.

For invitation and alert email delivery, also configure `RESEND_API_KEY`,
`INVITE_FROM_EMAIL`, and `ALERT_FROM_EMAIL`. Optional GitHub collaborator
automation needs `GITHUB_PAT`, `GITHUB_OWNER`, and `GITHUB_REPO`.

After deployment, add `<app-name>.azurewebsites.net` to the Firebase
Authentication authorized domains and update every monitoring agent:

```bash
NEXO_API_URL=https://<app-name>.azurewebsites.net/api/v1/telemetry
NEXO_LOG_API_URL=https://<app-name>.azurewebsites.net/api/v1/logs
```

Verify the deployment before switching agents:

```bash
curl -fsS https://<app-name>.azurewebsites.net/api/health
```

## Vercel

The existing Vercel deployment remains supported.

Required environment variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `APP_URL`

For invitation and alert email delivery, also configure `RESEND_API_KEY`,
`INVITE_FROM_EMAIL`, and `ALERT_FROM_EMAIL`. If invitation email is unavailable,
the owner or admin receives a link to share manually.

Deploy Firestore rules separately with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project nexocloud-software
```
