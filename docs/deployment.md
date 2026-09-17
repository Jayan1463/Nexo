# Deployment

Deploy the app and API to Vercel.

Required environment variables:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `RESEND_API_KEY`
- `INVITE_FROM_EMAIL`
- `ALERT_FROM_EMAIL`
- `APP_URL`

Deploy Firestore rules separately with Firebase CLI:

```bash
firebase deploy --only firestore:rules --project nexocloud-software
```
