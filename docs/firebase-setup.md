# Firebase Setup

Enable:

- Firebase Authentication with Email/Password and Google provider
- Firestore Native mode
- Authorized web domains for local and deployed URLs

Deploy rules:

```bash
firebase login:use mrithyunjayan1463@gmail.com
firebase deploy --only firestore:rules --project nexocloud-software
```

For backend APIs, set `FIREBASE_SERVICE_ACCOUNT_JSON` in the deployment environment.
