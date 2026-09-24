# Deployment

Deploy the app and API to Vercel.

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
