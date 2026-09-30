# Nexo frontend source code

Generated from project: `/Users/mrithyunjayanm/Projects/Nexo`


## `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="application-name" content="Nexo Cloud" />
    <meta name="apple-mobile-web-app-title" content="Nexo Cloud" />
    <title>Nexo Cloud</title>
    <script>
      (function() {
        const theme = localStorage.getItem('theme') || 'dark';
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

```

## `package.json`

```json
{
  "name": "react-example",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx server.ts",
    "start": "tsx server.ts",
    "build": "vite build",
    "preview": "vite preview",
    "deploy:live": "vercel --prod",
    "desktop:dev": "concurrently -k \"vite\" \"wait-on tcp:5173 && electron electron/main.cjs\"",
    "desktop:build": "npm run build && electron-builder --mac dmg",
    "clean": "rm -rf dist",
    "lint": "tsc --noEmit",
    "test": "node tests/srs-smoke.test.mjs && node --import tsx --test tests/invitation-email.test.ts",
    "test:e2e": "playwright test",
    "test:e2e:real": "firebase emulators:exec --config firebase.e2e.json --project demo-nexo-e2e --only auth,firestore 'playwright test --config playwright.real.config.ts'",
    "test:all": "npm run lint && npm test && npm run build && npm run test:e2e && npm run test:e2e:real"
  },
  "dependencies": {
    "@react-three/drei": "^10.7.7",
    "@react-three/fiber": "^9.5.0",
    "@tailwindcss/vite": "^4.1.14",
    "@vitejs/plugin-react": "^5.0.4",
    "clsx": "^2.1.1",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "12.19.0",
    "firebase-admin": "^13.7.0",
    "framer-motion": "^12.38.0",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "recharts": "^3.8.0",
    "tailwind-merge": "^3.5.0",
    "three": "^0.183.2",
    "tsx": "^4.21.0",
    "vite": "^6.2.0",
    "zustand": "^5.0.12"
  },
  "devDependencies": {
    "@playwright/test": "^1.63.0",
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "autoprefixer": "^10.4.21",
    "concurrently": "^9.2.1",
    "electron": "^35.1.5",
    "electron-builder": "^26.0.12",
    "tailwindcss": "^4.1.14",
    "typescript": "~5.8.2",
    "wait-on": "^8.0.3"
  },
  "engines": {
    "node": ">=22"
  },
  "main": "electron/main.cjs",
  "build": {
    "appId": "com.nexocloud.desktop",
    "productName": "Nexo Cloud",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "mac": {
      "target": [
        "dmg"
      ],
      "category": "public.app-category.developer-tools"
    }
  }
}

```

## `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": [
      "ES2022",
      "DOM",
      "DOM.Iterable"
    ],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": [
        "./*"
      ]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}

```

## `vite.config.ts`

```tsx
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});

```

## `src/App.tsx`

```tsx
import { sendEmailVerification, reload } from 'firebase/auth';
import { createProject } from './lib/projects';
import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signOut,
  signInWithPopup, 
  signInWithRedirect,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  getDocs,
  limit,
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from './firebase';
import { useAppStore } from './store';
import { Organization, Project } from './types';
import { cn } from './lib/utils';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
const Dashboard = lazy(() => import('./pages/Dashboard').then(({ Dashboard }) => ({ default: Dashboard })));
const Servers = lazy(() => import('./pages/Servers').then(({ Servers }) => ({ default: Servers })));
const Analytics = lazy(() => import('./pages/Analytics').then(({ Analytics }) => ({ default: Analytics })));
const Logs = lazy(() => import('./pages/Logs').then(({ Logs }) => ({ default: Logs })));
const Alerts = lazy(() => import('./pages/Alerts').then(({ Alerts }) => ({ default: Alerts })));
const Cost = lazy(() => import('./pages/Cost').then(({ Cost }) => ({ default: Cost })));
const Settings = lazy(() => import('./pages/Settings').then(({ Settings }) => ({ default: Settings })));
const Incidents = lazy(() => import('./pages/Incidents').then(({ Incidents }) => ({ default: Incidents })));
const RiskAnalysis = lazy(() => import('./pages/RiskAnalysis').then(({ RiskAnalysis }) => ({ default: RiskAnalysis })));
const StatusPage = lazy(() => import('./pages/StatusPage').then(({ StatusPage }) => ({ default: StatusPage })));
const HelpDocs = lazy(() => import('./pages/HelpDocs').then(({ HelpDocs }) => ({ default: HelpDocs })));
const Team = lazy(() => import('./pages/Team').then(({ Team }) => ({ default: Team })));
const ApiKeys = lazy(() => import('./pages/ApiKeys').then(({ ApiKeys }) => ({ default: ApiKeys })));
const AuditLogs = lazy(() => import('./pages/AuditLogs').then(({ AuditLogs }) => ({ default: AuditLogs })));
const Reports = lazy(() => import('./pages/Reports').then(({ Reports }) => ({ default: Reports })));
import { 
  Zap, 
  ArrowRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppRole, canAccessTab } from './lib/rbac';
import { FirebaseError } from 'firebase/app';
import { User } from 'firebase/auth';

const makeInviteCode = () => crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();

const E2E_AUTH_STORAGE_KEY = 'nexo:e2e-auth';
const isAcceptInviteRoute = () => window.location.pathname === '/accept-invite';

const getUserProfilePayload = (firebaseUser: User) => {
  if (!firebaseUser.email) {
    throw new Error('Your account is missing an email address. Please sign in with an email-enabled provider.');
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
  };
};

const createOwnedWorkspace = async (firebaseUser: User) => {
  const orgRef = doc(collection(db, 'organizations'));
  const orgId = orgRef.id;
  const inviteCode = makeInviteCode();

  await setDoc(orgRef, {
    id: orgId,
    name: `${firebaseUser.displayName || 'My'}'s Organization`,
    ownerId: firebaseUser.uid,
    inviteCode,
    plan: 'free',
    createdAt: serverTimestamp(),
  });

  await setDoc(doc(db, `organizations/${orgId}/members`, firebaseUser.uid), {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName || '',
    photoURL: firebaseUser.photoURL || '',
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  return orgId;
};

function getE2EUser() {
  const enabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_E2E_AUTH === 'true';
  if (!enabled || localStorage.getItem(E2E_AUTH_STORAGE_KEY) !== 'owner') return null;

  return {
    uid: 'e2e-owner',
    email: 'e2e-owner@nexocloud.local',
    displayName: 'E2E Owner',
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    tenantId: null,
    providerData: [],
  } as any;
}

class RouteErrorBoundary extends React.Component<
  { routeKey: string; children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  state = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown) {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'This module failed to render.',
    };
  }

  componentDidCatch(error: unknown) {
    console.error('Nexo Cloud module crashed', error);
  }

  componentDidUpdate(previousProps: { routeKey: string }) {
    if (previousProps.routeKey !== this.props.routeKey && this.state.hasError) {
      this.setState({ hasError: false, message: '' });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-500">
          <p className="text-lg font-black text-zinc-900 dark:text-white">This module hit an error.</p>
          <p className="mt-2 text-sm text-red-500">{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="mt-4 rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}

export default function App() {
  const { user, setUser, currentOrgId, currentProjectId, setOrg, setProject, theme, isSidebarCollapsed } = useAppStore();
  const [activeTab, setActiveTab] = useState(() => new URLSearchParams(window.location.search).get('tab') || 'dashboard');
  const [userRole, setUserRole] = useState<AppRole>('viewer');
  useEffect(() => { useAppStore.setState({ userRole }); }, [userRole]);
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const inviteHandledRef = useRef(false);
  const [inviteVerification, setInviteVerification] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState('');
  const [inviteRetry, setInviteRetry] = useState(0);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    inviteHandledRef.current = false;
    let unsubscribeUserDoc: (() => void) | null = null;
    let unsubscribeMemberDoc: (() => void) | null = null;
    const e2eUser = getE2EUser();
    if (e2eUser) {
      setUser(e2eUser);
      setOrg('e2e-org');
      setProject('e2e-project');
      setUserRole('owner');
      setLoading(false);
      return () => undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthError('');
      if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
      if (unsubscribeMemberDoc) { unsubscribeMemberDoc(); unsubscribeMemberDoc = null; }

      if (firebaseUser) {
        setOrg(null);
        setProject(null);
        setUser(firebaseUser);
        setWorkspaceLoading(true);
        setLoading(false);

        if (isAcceptInviteRoute()) {
          setWorkspaceLoading(false);
          return;
        }

        const bootstrapAccount = async () => {
          const profile = getUserProfilePayload(firebaseUser);
          const userRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userRef);
          const userData = userSnap.exists() ? userSnap.data() as any : {};
          const userOrgIds = Array.isArray(userData?.orgIds)
            ? userData.orgIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : [];
          let orgId = (typeof userData?.currentOrgId === 'string' && userData.currentOrgId.length > 0)
            ? userData.currentOrgId
            : (userOrgIds[0] || '');

          if (!orgId) {
            orgId = await createOwnedWorkspace(firebaseUser);
          }

          setOrg(orgId);

          const orgSnap = await getDoc(doc(db, 'organizations', orgId));
          if (!orgSnap.exists()) {
            throw new Error('Your workspace could not be loaded. Please try signing in again.');
          }

          const orgData = orgSnap.data() as any;
          if (!orgData.inviteCode && orgData.ownerId === firebaseUser.uid) {
            await setDoc(doc(db, 'organizations', orgId), { inviteCode: makeInviteCode() }, { merge: true });
          }

          const memberRef = doc(db, `organizations/${orgId}/members`, firebaseUser.uid);
          const memberSnap = await getDoc(memberRef);
          const roleForMembership: AppRole = orgData.ownerId === firebaseUser.uid ? 'owner' : 'viewer';
          if (!memberSnap.exists()) {
            if (orgData.ownerId !== firebaseUser.uid) {
              throw new Error('Your workspace membership could not be found. Ask an administrator to invite you.');
            }
            await setDoc(memberRef, {
              ...profile,
              role: roleForMembership,
              joinedAt: serverTimestamp(),
            }, { merge: true });
          }
          const membershipRole = roleForMembership === 'owner' ? 'owner' : memberSnap.exists() && ['admin', 'developer', 'viewer'].includes(memberSnap.data()?.role)
            ? memberSnap.data()!.role as AppRole : roleForMembership;

          const mergedOrgIds = Array.from(new Set([orgId, ...userOrgIds]));
          await setDoc(userRef, {
            ...profile,
            role: membershipRole,
            currentOrgId: orgId,
            orgIds: mergedOrgIds,
            createdAt: userData?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const projectsQuery = query(collection(db, `organizations/${orgId}/projects`), limit(1));
          const projectsSnap = await getDocs(projectsQuery);
          let projectId = projectsSnap.empty ? '' : projectsSnap.docs[0].id;
          if (!projectId) {
            projectId = await createProject(orgId, 'Default Project', 'prod');
          }

          setProject(projectId);
          setUserRole(membershipRole);

          const watchMembership = (activeOrgId: string, isOwner: boolean) => {
            if (unsubscribeMemberDoc) unsubscribeMemberDoc();
            unsubscribeMemberDoc = onSnapshot(doc(db, `organizations/${activeOrgId}/members`, firebaseUser.uid), (snap) => {
              if (!snap.exists()) {
                setUserRole('viewer');
                void signOut(auth);
                return;
              }
              const role = snap.data()?.role;
              setUserRole(isOwner ? 'owner' : ['admin', 'developer', 'viewer'].includes(role) ? role as AppRole : 'viewer');
            }, (error) => {
              console.error('Failed to load membership role', error);
              setUserRole('viewer');
              if (error.code === 'permission-denied') void signOut(auth);
            });
          };
          watchMembership(orgId, orgData.ownerId === firebaseUser.uid);

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data() as any;
            const nextOrgId = typeof data?.currentOrgId === 'string' ? data.currentOrgId : useAppStore.getState().currentOrgId;
            const activeOrgId = useAppStore.getState().currentOrgId;
            if (nextOrgId && nextOrgId !== activeOrgId) {
              setUserRole('viewer');
              setOrg(nextOrgId);
              setProject(null);
              try {
                const nextMember = await getDoc(doc(db, `organizations/${nextOrgId}/members`, firebaseUser.uid));
                if (!nextMember.exists()) throw new Error('Workspace membership missing');
                const nextOrg = await getDoc(doc(db, 'organizations', nextOrgId));
                watchMembership(nextOrgId, nextOrg.data()?.ownerId === firebaseUser.uid);
                const nextProjects = await getDocs(query(collection(db, `organizations/${nextOrgId}/projects`), limit(1)));
                if (!nextProjects.empty && useAppStore.getState().currentOrgId === nextOrgId) setProject(nextProjects.docs[0].id);
              } catch {
                setAuthError('Your workspace access has changed. Please sign in again.');
              }
            }
          });
        };

        bootstrapAccount().catch((error) => {
          console.error('Auth bootstrap failed', error);
          setUser(null);
          setOrg(null);
          setProject(null);
          setAuthError(error instanceof Error ? error.message : 'Account setup failed. Please try again.');
        }).finally(() => {
          setWorkspaceLoading(false);
        });

        return;
      }

      setUser(null);
      setOrg(null);
      setProject(null);
      setUserRole('viewer');
      setWorkspaceLoading(false);
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }
      if (unsubscribeMemberDoc) {
        unsubscribeMemberDoc();
        unsubscribeMemberDoc = null;
      }
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
      if (unsubscribeMemberDoc) unsubscribeMemberDoc();
    };
  }, [setUser, setOrg, setProject]);
  useEffect(() => {
    if (loading || workspaceLoading || !user) return;
    if (!canAccessTab(userRole, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, userRole, loading, workspaceLoading, user]);

  useEffect(() => {
    const acceptInvite = async () => {
      if (!user || workspaceLoading || inviteHandledRef.current) return;
      if (!isAcceptInviteRoute()) return;

      if (!auth.currentUser?.emailVerified) { setInviteVerification(true); return; }
      setInviteVerification(false);
      inviteHandledRef.current = true;
      const params = new URLSearchParams(window.location.search);
      const orgId = params.get('orgId');
      const inviteId = params.get('inviteId');
      const token = params.get('token');

      if (!orgId || !inviteId || !token || !user.email) {
        alert('Invalid invite link. Please ask for a new invitation.');
        window.history.replaceState({}, '', '/');
        return;
      }

      try {
        const idToken = await auth.currentUser?.getIdToken(true);
        if (!idToken) throw new Error('Please sign in again.');
        const response = await fetch('/api/accept-invite', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ orgId, inviteId, token }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Invite could not be accepted.');
        setOrg(orgId);
        setProject(String(payload.projectId));
        if (['owner', 'admin', 'developer', 'viewer'].includes(payload.role)) setUserRole(payload.role);
        alert('Invite accepted. Welcome to the organization.');
      } catch (error) {
        console.error('Failed to accept invite', error);
        const message = error instanceof Error ? error.message : 'Invite could not be accepted.';
        alert(message);
      } finally {
        window.history.replaceState({}, '', '/');
      }
    };

    acceptInvite();
  }, [user, workspaceLoading, currentOrgId, currentProjectId, setOrg, setProject, inviteRetry]);

  if (inviteVerification && user) {
    return <main className="min-h-screen p-8 flex items-center justify-center bg-white text-zinc-900">
      <section className="max-w-md space-y-5">
        <h1 className="text-2xl font-bold">Verify email to accept invitation</h1>
        <p>Verify {user.email} to join this organization. After verification, return here to continue.</p>
        <button className="block rounded-xl bg-emerald-500 px-5 py-3" onClick={async () => {
          try {
            if (auth.currentUser) await sendEmailVerification(auth.currentUser);
            setVerificationMessage('Verification email sent.');
          } catch { setVerificationMessage('Could not send verification email. Please retry.'); }
        }}>Send verification email</button>
        <button className="block rounded-xl border px-5 py-3" onClick={async () => {
          try {
            if (!auth.currentUser) return;
            await reload(auth.currentUser);
            await auth.currentUser.getIdToken(true);
            if (!auth.currentUser.emailVerified) { setVerificationMessage('Email is not verified yet.'); return; }
            setInviteRetry((value) => value + 1);
          } catch { setVerificationMessage('Could not check verification. Please retry.'); }
        }}>I verified my email</button>
        <p role="status">{verificationMessage}</p>
      </section>
    </main>;
  }

  if (loading) {
    return (
      <LoadingScreen label="INITIALIZING NEXO CLOUD..." />
    );
  }

  if (!user && window.location.pathname.startsWith('/status')) {
    return <StatusPage />;
  }

  if (!user) {
    return <LoginPage authError={authError} />;
  }

  if (workspaceLoading || !currentOrgId || !currentProjectId) {
    return <LoadingScreen label="LOADING VERIFIED WORKSPACE..." />;
  }

  return (
    <div className="h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 overflow-hidden font-sans transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userRole={userRole} />
      
      <main className={cn(
        "h-full bg-zinc-50 dark:bg-zinc-950 overflow-y-scroll force-scrollbar transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
        isSidebarCollapsed ? "lg:ml-24" : "lg:ml-72"
      )}>
        <TopBar
          onSettingsClick={() => setActiveTab('settings')}
          showContextSelectors={false}
          showQuickContext={true}
        />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <RouteErrorBoundary routeKey={activeTab}>
              <Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading module...</div>}>
                {activeTab === 'dashboard' && <Dashboard />}
                {activeTab === 'servers' && <Servers />}
                {activeTab === 'analytics' && <Analytics />}
                {activeTab === 'logs' && <Logs />}
                {activeTab === 'alerts' && <Alerts />}
                {activeTab === 'incidents' && <Incidents />}
                {activeTab === 'cost' && <Cost />}
                {activeTab === 'risk' && <RiskAnalysis />}
                {activeTab === 'status' && <StatusPage />}
                {activeTab === 'team' && <Team />}
                {activeTab === 'apiKeys' && <ApiKeys />}
                {activeTab === 'audit' && <AuditLogs />}
                {activeTab === 'reports' && <Reports />}
                {activeTab === 'help' && <HelpDocs />}
                {activeTab === 'settings' && <Settings />}
              </Suspense>
            </RouteErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

const LoadingScreen = ({ label }: { label: string }) => (
  <div className="h-screen w-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center animate-pulse">
      <Zap className="text-zinc-950 w-6 h-6 fill-current" />
    </div>
    <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm tracking-widest animate-pulse">{label}</p>
  </div>
);

const LoginPage = ({ authError = '' }: { authError?: string }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const submitting = submittingEmail || submittingGoogle;

  const handleGoogleLogin = async () => {
    setSubmittingGoogle(true);
    try {
      setErrorMessage('');
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Google login failed', error);
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/popup-blocked') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        if (error.code === 'auth/popup-closed-by-user') {
          setErrorMessage('Google sign-in was cancelled before completion.');
        } else if (error.code === 'auth/unauthorized-domain') {
          setErrorMessage('This domain is not authorized in Firebase authentication settings.');
        } else if (error.code === 'auth/operation-not-allowed') {
          setErrorMessage('Google sign-in is not enabled for this project.');
        } else if (error.code === 'auth/network-request-failed') {
          setErrorMessage('Network error during Google sign-in. Check your connection and try again.');
        } else {
          setErrorMessage('Google sign-in failed. Please try again.');
        }
      } else {
        setErrorMessage('Google sign-in failed. Please try again.');
      }
    } finally {
      setSubmittingGoogle(false);
    }
  };

  const handleEmailAuth = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password.trim()) {
      setErrorMessage('Email and password are required.');
      return;
    }
    if (mode === 'signup') {
      if (!displayName.trim()) {
        setErrorMessage('Display name is required for sign up.');
        return;
      }
      if (password.length < 8) {
        setErrorMessage('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setSubmittingEmail(true);
    setErrorMessage('');
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, normalizedEmail, password);
      } else {
        const cred = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
    } catch (error) {
      console.error('Email auth failed', error);
      if (error instanceof FirebaseError) {
        if (mode === 'login') {
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            setErrorMessage('Invalid email or password.');
          } else if (error.code === 'auth/invalid-email') {
            setErrorMessage('Please enter a valid email address.');
          } else if (error.code === 'auth/too-many-requests') {
            setErrorMessage('Too many failed attempts. Please wait and try again.');
          } else {
            setErrorMessage('Login failed. Please try again.');
          }
        } else {
          if (error.code === 'auth/email-already-in-use') {
            setErrorMessage('This email is already in use. Try logging in.');
          } else if (error.code === 'auth/invalid-email') {
            setErrorMessage('Please enter a valid email address.');
          } else if (error.code === 'auth/weak-password') {
            setErrorMessage('Password is too weak. Use at least 8 characters.');
          } else {
            setErrorMessage('Could not create account. Please try again.');
          }
        }
      } else {
        setErrorMessage(mode === 'login' ? 'Invalid email/password.' : 'Could not create account.');
      }
    } finally {
      setSubmittingEmail(false);
    }
  };
  const handleForgotPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setErrorMessage('Enter your email address first.');
      return;
    }
    try {
      setErrorMessage('');
      await sendPasswordResetEmail(auth, normalizedEmail);
      setInfoMessage('Password reset email sent.');
    } catch (error) {
      console.error('Password reset failed', error);
      setErrorMessage('Could not send password reset email.');
    }
  };
  useEffect(() => {
    setErrorMessage('');
    setInfoMessage('');
  }, [mode]);

  return (
    <div className="min-h-screen w-screen bg-white text-zinc-900">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="px-8 md:px-14 py-8 lg:py-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 bg-zinc-50 gap-10">
          <nav className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-sm">
                <Zap className="text-white w-6 h-6 fill-current" />
              </div>
              <span className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900">Nexo Cloud</span>
            </div>
            <div className="hidden xl:flex items-center gap-5 text-xs font-black uppercase tracking-widest text-zinc-500">
              <a href="#features">Features</a>
              <a href="#infrastructure">Infrastructure</a>
              <a href="#security">Security</a>
              <a href="#docs">Documentation</a>
              <a href="/status">Status</a>
            </div>
          </nav>

          <div className="max-w-3xl space-y-7">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-600 font-bold">Observe. Predict. Protect.</p>
            <h1 className="text-5xl md:text-7xl font-black leading-[1.02] tracking-tight text-zinc-900">
              Your Infrastructure. One Intelligent View.
            </h1>
            <p className="text-zinc-600 text-base md:text-lg max-w-2xl leading-relaxed">
              Real-time infrastructure monitoring, centralized logs, incident management, risk intelligence, public status, and estimated cloud cost visibility in one NEXO CLOUD workspace.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setMode('signup')} className="bg-zinc-900 text-white px-6 py-3 rounded-xl font-black">Start Monitoring</button>
              <a href="/status" className="border border-zinc-300 px-6 py-3 rounded-xl font-black text-zinc-900">View Status</a>
            </div>
          </div>

          <div id="features" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Infrastructure Monitoring', 'Metrics', 'Logs', 'Alerts', 'Incidents', 'Risk Analysis', 'Cost Intelligence', 'Public Status Page'].map((feature) => (
              <div key={feature} className="bg-white border border-zinc-200 rounded-xl p-4 text-sm font-bold text-zinc-700">{feature}</div>
            ))}
          </div>

          <div id="infrastructure" className="bg-zinc-900 text-white rounded-2xl p-6 font-mono text-xs leading-7">
            Server → Nexo Monitoring Agent → Secure Telemetry API → Node/Express Backend → Firestore → Real-Time Nexo Dashboard
          </div>

          <div id="security" className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {['Firebase Auth + RBAC', 'Hashed API keys', 'Firestore security rules'].map((item) => (
              <div key={item} className="bg-white border border-zinc-200 rounded-xl p-4 text-xs font-black uppercase tracking-widest text-zinc-500">{item}</div>
            ))}
          </div>

          <div className="text-xs text-zinc-500">
            <span id="docs">Documentation, monitoring-agent setup, API reference, and deployment notes are included in the repository.</span>
          </div>
        </section>

        <section className="px-8 md:px-14 py-14 lg:py-20 flex items-center justify-center">
          <div className="w-full max-w-xl space-y-6 bg-white border border-zinc-200 rounded-3xl p-7 md:p-10 shadow-sm">
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
              <p className="text-sm text-zinc-600">
                {mode === 'login' ? 'Sign in to continue to your dashboard.' : 'Start your workspace in under a minute.'}
              </p>
            </div>

            <div className="inline-flex bg-zinc-100 border border-zinc-200 rounded-xl p-1 w-full">
              <button
                type="button"
                onClick={() => setMode('login')}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm rounded-lg font-semibold transition-colors",
                  mode === 'login'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={cn(
                  "flex-1 px-4 py-2.5 text-sm rounded-lg font-semibold transition-colors",
                  mode === 'signup'
                    ? "bg-white text-zinc-900 shadow-sm"
                    : "text-zinc-600 hover:text-zinc-900"
                )}
              >
                Sign Up
              </button>
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void handleEmailAuth();
              }}
            >
              {mode === 'signup' && (
                <input
                  type="text"
                  placeholder="Display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              )}
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
              />
              {mode === 'signup' && (
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-zinc-300 rounded-xl px-4 py-3.5 text-sm text-zinc-900 focus:outline-none focus:border-zinc-900 transition-colors"
                />
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-zinc-900 text-white py-3.5 rounded-xl font-extrabold text-base hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {submittingEmail ? 'Please wait...' : mode === 'login' ? 'Login with Email' : 'Create Account'}
              </button>
              {mode === 'login' && (
                <button type="button" onClick={handleForgotPassword} className="w-full text-sm font-bold text-zinc-500 hover:text-zinc-900">
                  Forgot password?
                </button>
              )}
            </form>

            {(errorMessage || authError) && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs text-left">
                {errorMessage || authError}
              </div>
            )}
            {infoMessage && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 px-3 py-2 text-xs text-left">
                {infoMessage}
              </div>
            )}

            <div className="flex items-center gap-3 py-1">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">or</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={submitting}
              className="w-full bg-white text-zinc-900 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 border border-zinc-300 hover:bg-zinc-50 transition-colors group disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
              {submittingGoogle ? 'Connecting...' : 'Continue with Google'}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="p-8 flex flex-col items-center justify-center min-h-[60vh] text-center">
    <div className="w-20 h-20 bg-zinc-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
      <Activity className="w-10 h-10 text-zinc-700" />
    </div>
    <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
    <p className="text-zinc-500 max-w-md">
      This module is currently processing real-time data from your infrastructure. 
      Advanced visualization will be available shortly.
    </p>
  </div>
);

```

## `src/components/InviteModal.tsx`

```tsx
import React, { useState } from 'react';
import { X, Mail, Shield, Loader2, Check } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { auth } from '../firebase';
import { ROLE_OPTIONS } from '../lib/roles';

export const InviteModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const { user, currentOrgId } = useAppStore();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'developer' | 'viewer'>('developer');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentOrgId) return;

    setLoading(true);
    setErrorMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in again.');
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          orgId: currentOrgId,
          role,
          invitedBy: user.uid
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to send invite');

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setEmail('');
        setErrorMessage('');
      }, 2000);
    } catch (error) {
      console.error("Failed to send invite", error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Invite Team Member</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleInvite} className="p-6 space-y-6">
          {success ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="text-zinc-950 w-6 h-6" />
              </div>
              <p className="text-emerald-500 font-medium">Invitation sent successfully!</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="w-full bg-zinc-950 border border-white/5 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={cn(
                        "py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all",
                        role === option.value 
                          ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" 
                          : "bg-zinc-950 border-white/5 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                disabled={loading}
                className="w-full bg-emerald-500 text-zinc-950 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Invitation'}
              </button>
              {errorMessage && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {errorMessage}
                </p>
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
};

```

## `src/components/MetricChart.tsx`

```tsx
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { format } from 'date-fns';
import { TrendingUp, Activity } from 'lucide-react';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

interface MetricChartProps {
  data: any[];
  type: 'cpu' | 'memory' | 'network' | 'disk';
  title: string;
  color?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  data,
  type,
  title,
  color = '#10b981'
}) => {
  const { theme } = useAppStore();

  const lastValue = Number(data[data.length - 1]?.value || 0);

  const avgValue =
    data.length > 0
      ? data.reduce((acc, d) => acc + Number(d.value || 0), 0) / data.length
      : 0;

  const minValue =
    data.length > 0
      ? Math.min(...data.map(d => Number(d.value || 0)))
      : 0;

  const maxValue =
    data.length > 0
      ? Math.max(...data.map(d => Number(d.value || 0)))
      : 0;

  const formatValue = (value: number) => {
    if (type === 'network') {
      return Number(value || 0).toFixed(2);
    }

    return Number(value || 0).toFixed(1);
  };

  const unit = type === 'network' ? 'MB/s' : '%';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="h-full min-h-[560px] flex flex-col bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/10 rounded-3xl p-6 shadow-md dark:shadow-none transition-all hover:border-emerald-500/30"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-emerald-500" />

            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em]">
              {title}
            </h3>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {formatValue(lastValue)}
            </span>

            <span className="text-lg font-semibold text-zinc-400">
              {unit}
            </span>
          </div>
        </div>

        <div className="h-10 w-10 rounded-xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center justify-center">
          <div
            className={cn(
              'w-3 h-3 rounded-full animate-pulse',
              {
                'bg-emerald-500': lastValue < 80,
                'bg-amber-500': lastValue >= 80 && lastValue < 95,
                'bg-red-500': lastValue >= 95
              }
            )}
          />
        </div>
      </div>

      <div className="mt-2 mb-4 flex items-center justify-between">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          Average
        </span>

        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          {formatValue(avgValue)} {unit}
        </span>
      </div>

      <div className="h-[260px] w-full flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient
                id={`gradient-${type}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={color}
                  stopOpacity={0.4}
                />

                <stop
                  offset="95%"
                  stopColor={color}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="timestamp"
              hide
            />

            <YAxis
              domain={[0, type === 'network' ? 'auto' : 100]}
              hide
            />

            <Tooltip
              cursor={{
                stroke: theme === 'dark' ? '#ffffff10' : '#00000010',
                strokeWidth: 2
              }}
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) {
                  return null;
                }

                const value = Number(payload[0]?.value || 0);
                const timestamp = payload[0]?.payload?.timestamp;

                return (
                  <motion.div
                    initial={{
                      opacity: 0,
                      scale: 0.9
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1
                    }}
                    className="bg-zinc-900 dark:bg-white border border-white/10 dark:border-zinc-200 p-4 rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
                  >
                    <p className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] mb-2">
                      {timestamp
                        ? format(new Date(timestamp), 'HH:mm:ss')
                        : '--:--:--'}
                    </p>

                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: color
                        }}
                      />

                      <p className="text-2xl font-black text-white dark:text-zinc-950 tracking-tighter">
                        {formatValue(value)}

                        <span className="text-xs ml-1 font-bold opacity-50">
                          {unit}
                        </span>
                      </p>
                    </div>
                  </motion.div>
                );
              }}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${type})`}
              strokeWidth={4}
              isAnimationActive={true}
              animationDuration={1500}
              dot={false}
              activeDot={{
                r: 8,
                strokeWidth: 4,
                stroke:
                  theme === 'dark'
                    ? '#18181b'
                    : '#ffffff',
                fill: color
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/10 grid grid-cols-[1fr_auto] items-center gap-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Minimum
            </span>

            <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">
              {formatValue(minValue)}

              <span className="text-base ml-1 text-zinc-400">
                {unit}
              </span>
            </span>
          </div>

          <div className="w-px h-10 bg-zinc-200 dark:bg-white/10 justify-self-center" />

          <div className="flex flex-col gap-1">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Maximum
            </span>

            <span className="text-2xl font-bold text-zinc-900 dark:text-white leading-none">
              {formatValue(maxValue)}

              <span className="text-base ml-1 text-zinc-400">
                {unit}
              </span>
            </span>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="h-10 w-10 flex items-center justify-center rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
        >
          <TrendingUp className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};
```

## `src/components/Sidebar.tsx`

```tsx
import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  FileText, 
  Bell, 
  DollarSign, 
  Settings,
  LogOut,
  ChevronRight,
  Zap,
  Server,
  ChevronLeft,
  Menu,
  Flame,
  ShieldAlert,
  BookOpen,
  Radio,
  Users,
  KeyRound,
  ClipboardList,
  FileBarChart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { auth, signOut } from '../firebase';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';
import { AppRole, canAccessTab } from '../lib/rbac';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: Server, label: 'Servers', id: 'servers' },
  { icon: BarChart3, label: 'Analytics', id: 'analytics' },
  { icon: FileText, label: 'Logs', id: 'logs' },
  { icon: Bell, label: 'Alerts', id: 'alerts' },
  { icon: Flame, label: 'Incidents', id: 'incidents' },
  { icon: DollarSign, label: 'Cost Intelligence', id: 'cost' },
  { icon: ShieldAlert, label: 'Risk Analysis', id: 'risk' },
  { icon: Radio, label: 'Status Page', id: 'status' },
  { icon: Users, label: 'Team', id: 'team' },
  { icon: KeyRound, label: 'API Keys', id: 'apiKeys' },
  { icon: ClipboardList, label: 'Audit Logs', id: 'audit' },
  { icon: FileBarChart, label: 'Reports', id: 'reports' },
  { icon: BookOpen, label: 'Help & Docs', id: 'help' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

export const Sidebar = ({ activeTab, setActiveTab, userRole }: { activeTab: string, setActiveTab: (id: string) => void, userRole: AppRole }) => {
  const { isSidebarCollapsed, setSidebarCollapsed } = useAppStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const filteredMenu = menuItems.filter((item) => canAccessTab(userRole, item.id));

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={isMobileMenuOpen}
        className="lg:hidden fixed bottom-8 right-8 z-50 w-16 h-16 bg-emerald-500 text-zinc-950 rounded-3xl shadow-[0_20px_50px_rgba(16,185,129,0.3)] flex items-center justify-center hover:bg-emerald-400 transition-all active:scale-90 hover:scale-110"
      >
        <Menu className="w-7 h-7" />
      </button>

      {/* Sidebar Container */}
      <div className={cn(
        "fixed lg:fixed lg:left-0 lg:top-0 z-40 h-screen bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-white/5 flex flex-col overflow-visible transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-2xl dark:shadow-none",
        isSidebarCollapsed ? "w-24" : "w-72",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo Section */}
        <div className={cn(
          "p-8 flex items-center gap-4 relative",
          isSidebarCollapsed && "justify-center px-0"
        )}>
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-11 h-11 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-2xl shadow-emerald-500/20 group cursor-pointer"
          >
            <Zap className="text-emerald-500 w-6 h-6 fill-current group-hover:scale-125 transition-transform" />
          </motion.div>
          
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-col"
              >
                <span className="text-xl font-black tracking-tighter text-zinc-900 dark:text-white leading-none">Nexo Cloud</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <button 
            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
            className={cn(
              "hidden lg:flex absolute -right-4 w-9 h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl items-center justify-center text-zinc-500 hover:text-emerald-500 transition-all shadow-xl hover:scale-110 active:scale-90 z-[90]",
              isSidebarCollapsed ? "top-6" : "top-10"
            )}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 mt-10 space-y-2 overflow-y-auto no-scrollbar">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-500 group relative overflow-hidden",
                activeTab === item.id 
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 scale-[1.02]" 
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-white/5",
                isSidebarCollapsed && "justify-center px-0"
              )}
              title={isSidebarCollapsed ? item.label : undefined}
            >
              <item.icon className={cn(
                "w-5 h-5 shrink-0 transition-all duration-500 group-hover:scale-110",
                activeTab === item.id ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
              )} />
              
              {!isSidebarCollapsed && (
                <>
                  <span className="text-sm font-black truncate tracking-tight">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]" 
                    />
                  )}
                </>
              )}
              
              {isSidebarCollapsed && activeTab === item.id && (
                <motion.div 
                  layoutId="activeIndicatorCollapsed"
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-10 bg-emerald-500 rounded-l-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                />
              )}
            </button>
          ))}
        </nav>
        
        {/* Footer Section */}
        <div className="p-6 space-y-4">
          <button 
            onClick={() => signOut(auth)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-3.5 text-zinc-500 dark:text-zinc-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-400/5 rounded-2xl transition-all group",
              isSidebarCollapsed && "justify-center px-0"
            )}
            title={isSidebarCollapsed ? "Sign Out" : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            {!isSidebarCollapsed && <span className="text-sm font-black tracking-tight">Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-zinc-950/80 backdrop-blur-md z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

```

## `src/components/TopBar.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronDown, 
  CheckCircle2, 
  Globe, 
  Sun, 
  Moon,
  Search,
  Command,
  Bell
} from 'lucide-react';
import { 
  db, 
  doc, 
  getDoc, 
  collection, 
  onSnapshot, 
  updateDoc,
  query,
  where,
  orderBy,
  limit
} from '../firebase';
import { useAppStore } from '../store';
import { Organization, Project } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export const TopBar = ({
  onSettingsClick,
  showContextSelectors = false,
  showQuickContext = true,
}: {
  onSettingsClick: () => void;
  showContextSelectors?: boolean;
  showQuickContext?: boolean;
}) => {
  const { user, currentOrgId, currentProjectId, setOrg, setProject, theme, setTheme } = useAppStore();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchRows, setSearchRows] = useState<Array<{ type: string; title: string; subtitle: string }>>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    if (!user) return;
    
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const userData = snap.data();
        const orgIds = Array.from(
          new Set(
            [userData.currentOrgId, ...(userData.orgIds || [])].filter(
              (id): id is string => typeof id === 'string' && id.length > 0,
            ),
          ),
        );
        
        const orgPromises = orgIds.map(async (id: string) => {
          try {
            const oSnap = await getDoc(doc(db, 'organizations', id));
            if (!oSnap.exists()) return null;
            const data = oSnap.data() as Partial<Organization>;
            return {
              id: data.id || oSnap.id,
              name: data.name || 'Untitled Organization',
              ownerId: data.ownerId || user.uid,
              plan: data.plan || 'free',
              createdAt: data.createdAt,
            } as Organization;
          } catch (error) {
            console.error(`Failed to load organization ${id}`, error);
            return null;
          }
        });
        
        const orgList = (await Promise.all(orgPromises)).filter(o => o !== null) as Organization[];
        setOrgs(orgList);
      }
    }, (error) => {
      console.error('Failed to load current user profile in top bar', error);
      setOrgs([]);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!currentOrgId) return;
    
    const projectsRef = collection(db, `organizations/${currentOrgId}/projects`);
    const unsubscribe = onSnapshot(projectsRef, (snap) => {
      const projectList = snap.docs.map((projectDoc) => {
        const data = projectDoc.data() as Partial<Project>;
        return {
          id: data.id || projectDoc.id,
          orgId: data.orgId || currentOrgId,
          name: data.name || 'Untitled Project',
          environment: data.environment || 'prod',
          createdAt: data.createdAt,
        } as Project;
      });
      setProjects(projectList);

      const hasCurrentProject = projectList.some((project) => project.id === currentProjectId);
      if (projectList.length > 0 && (!currentProjectId || !hasCurrentProject)) {
        setProject(projectList[0].id);
      }
    }, (error) => {
      console.error('Failed to load projects in top bar', error);
      setProjects([]);
    });

    return () => unsubscribe();
  }, [currentOrgId, currentProjectId, setProject]);

  useEffect(() => {
    if (!currentProjectId || (!searchFocused && !searchTerm.trim())) {
      setSearchRows([]);
      return;
    }

    const rows: Array<{ type: string; title: string; subtitle: string }> = [];
    const pushAndFilter = () => {
      const term = searchTerm.trim().toLowerCase();
      setSearchRows(term ? rows.filter((row) => `${row.type} ${row.title} ${row.subtitle}`.toLowerCase().includes(term)).slice(0, 8) : []);
    };
    const handleSearchError = (label: string) => (error: unknown) => {
      console.error(`Global search ${label} listener failed`, error);
      setSearchRows([]);
    };
    const unsubServers = onSnapshot(query(collection(db, 'servers'), where('projectId', '==', currentProjectId)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Server'));
      snapshot.docs.forEach((serverDoc) => {
        const data = serverDoc.data() as any;
        if (!isActiveServer(data)) return;
        rows.push({ type: 'Server', title: data.name || serverDoc.id, subtitle: data.status || 'unknown' });
      });
      pushAndFilter();
    }, handleSearchError('servers'));
    const unsubAlerts = onSnapshot(query(collection(db, `projects/${currentProjectId}/alerts`), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Alert'));
      snapshot.docs.forEach((alertDoc) => {
        const data = alertDoc.data() as any;
        rows.push({ type: 'Alert', title: data.message || alertDoc.id, subtitle: `${data.severity || 'info'} · ${data.status || 'active'}` });
      });
      pushAndFilter();
    }, handleSearchError('alerts'));
    const unsubLogs = onSnapshot(query(collection(db, `projects/${currentProjectId}/logs`), orderBy('timestamp', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Log'));
      snapshot.docs.forEach((logDoc) => {
        const data = logDoc.data() as any;
        rows.push({ type: 'Log', title: data.message || logDoc.id, subtitle: `${data.level || 'info'} · ${data.service || 'system'}` });
      });
      pushAndFilter();
    }, handleSearchError('logs'));
    const unsubIncidents = onSnapshot(query(collection(db, `projects/${currentProjectId}/incidents`), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
      rows.splice(0, rows.length, ...rows.filter((row) => row.type !== 'Incident'));
      snapshot.docs.forEach((incidentDoc) => {
        const data = incidentDoc.data() as any;
        rows.push({ type: 'Incident', title: data.title || incidentDoc.id, subtitle: data.status || 'investigating' });
      });
      pushAndFilter();
    }, handleSearchError('incidents'));
    return () => {
      unsubServers();
      unsubAlerts();
      unsubLogs();
      unsubIncidents();
    };
  }, [currentProjectId, searchTerm]);

  useEffect(() => {
    if (!user?.uid || !showNotifications) {
      if (!showNotifications) setNotifications([]);
      return;
    }

    const notificationQuery = query(collection(db, 'notifications'), where('recipientUserId', '==', user.uid), orderBy('createdAt', 'desc'), limit(10));
    return onSnapshot(notificationQuery, (snapshot) => {
      setNotifications(snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() })));
    }, (error) => {
      console.error('Notifications listener failed', error);
      setNotifications([]);
    });
  }, [showNotifications, user?.uid]);

  const currentOrg = orgs.find(o => o.id === currentOrgId);
  const currentProject = projects.find(p => p.id === currentProjectId);
  const normalizedOrgName = (currentOrg?.name || 'Select Org').replace(/'s Organization$/i, '').replace(/ Organization$/i, '').trim();

  const handleSwitchOrg = async (orgId: string) => {
    if (!user) return;
    setOrg(orgId);
    setProject(null);
    await updateDoc(doc(db, 'users', user.uid), { currentOrgId: orgId });
    setShowOrgSwitcher(false);
  };

  const handleSwitchProject = (projectId: string) => {
    setProject(projectId);
    setShowProjectSwitcher(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
        setSearchFocused(true);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="h-24 border-b border-zinc-200 dark:border-white/5 flex items-center justify-between px-8 backdrop-blur-2xl sticky top-0 z-40 bg-white/80 dark:bg-zinc-950/80 transition-all duration-500">
      <div className="flex items-center gap-6 h-16">
        {showContextSelectors && (
          <>
        {/* Org Switcher */}
        <div className="relative">
          <button 
            onClick={() => {
              setShowOrgSwitcher(!showOrgSwitcher);
              setShowProjectSwitcher(false);
            }}
            className="h-16 flex items-center gap-4 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 group shadow-sm dark:shadow-none"
          >
            <div className="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Organization</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-none">{currentOrg?.name || 'Select Org'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-500", showOrgSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showOrgSwitcher && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-4 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-4 z-50 backdrop-blur-2xl"
              >
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/5 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Switch Workspace</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {orgs.length === 0 && (
                    <div className="px-4 py-5 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      No organizations found yet. Reload after signing in.
                    </div>
                  )}
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all group",
                        org.id === currentOrgId 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-white/5" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", org.id === currentOrgId ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                        <span className="font-black truncate tracking-tight">{org.name}</span>
                      </div>
                      {org.id === currentOrgId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Project Switcher */}
        <div className="relative mr-3">
          <button 
            onClick={() => {
              setShowProjectSwitcher(!showProjectSwitcher);
              setShowOrgSwitcher(false);
            }}
            className="h-16 flex items-center gap-4 bg-zinc-50 dark:bg-white/5 px-5 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 group shadow-sm dark:shadow-none"
          >
            <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)] group-hover:scale-110 transition-transform" />
            <div className="flex flex-col items-center justify-center text-center leading-tight">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">Active Project</span>
              <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight leading-none">{currentProject?.name || 'Select Project'}</span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform duration-500", showProjectSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showProjectSwitcher && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full left-0 mt-4 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2rem] shadow-2xl p-4 z-50 backdrop-blur-2xl"
              >
                <div className="px-4 py-3 border-b border-zinc-100 dark:border-white/5 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Switch Project</span>
                </div>
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSwitchProject(project.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm transition-all group",
                        project.id === currentProjectId 
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 shadow-xl shadow-zinc-900/10 dark:shadow-white/5" 
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", project.id === currentProjectId ? "bg-blue-500" : "bg-zinc-300 dark:bg-zinc-700")} />
                        <span className="font-black truncate tracking-tight">{project.name}</span>
                      </div>
                      {project.id === currentProjectId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-6 h-16 ml-2">
        {showQuickContext && (
          <>
        <div className="relative">
          <button
            onClick={() => {
              setShowOrgSwitcher(!showOrgSwitcher);
              setShowProjectSwitcher(false);
            }}
            className="h-16 flex items-center gap-3 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm dark:shadow-none"
            title="Choose organization"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white max-w-36 truncate">{normalizedOrgName}</span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showOrgSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showOrgSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl p-3 z-50 backdrop-blur-2xl"
              >
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {orgs.length === 0 && (
                    <div className="px-4 py-5 text-sm text-zinc-500 dark:text-zinc-400 text-center">
                      No organizations found yet. Reload after signing in.
                    </div>
                  )}
                  {orgs.map((org) => (
                    <button
                      key={org.id}
                      onClick={() => handleSwitchOrg(org.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                        org.id === currentOrgId
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <span className="font-bold truncate">{org.name}</span>
                      {org.id === currentOrgId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setShowProjectSwitcher(!showProjectSwitcher);
              setShowOrgSwitcher(false);
            }}
            className="h-16 flex items-center gap-3 bg-zinc-50 dark:bg-white/5 px-4 rounded-2xl border border-zinc-200 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 transition-all active:scale-95 shadow-sm dark:shadow-none"
            title="Choose project"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white max-w-32 truncate">{currentProject?.name || 'Select Project'}</span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", showProjectSwitcher && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showProjectSwitcher && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl p-3 z-50 backdrop-blur-2xl"
              >
                <div className="space-y-1.5 max-h-80 overflow-y-auto no-scrollbar">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSwitchProject(project.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                        project.id === currentProjectId
                          ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-950"
                          : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-white"
                      )}
                    >
                      <span className="font-bold truncate">{project.name}</span>
                      {project.id === currentProjectId && <CheckCircle2 className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
          </>
        )}

        {/* Global Search */}
        <div className={cn(
          "hidden md:flex h-16 items-center gap-3 bg-zinc-50 dark:bg-white/5 px-5 rounded-2xl border transition-all duration-500 shadow-sm dark:shadow-none",
          searchFocused 
            ? "w-96 border-emerald-500/50 ring-4 ring-emerald-500/5" 
            : "w-72 border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10"
        )}>
          <Search className={cn("w-4 h-4 transition-colors", searchFocused ? "text-emerald-500" : "text-zinc-400")} />
          <input 
            ref={searchInputRef}
            type="text" 
            placeholder="Search infrastructure..." 
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            className="bg-transparent border-none outline-none text-sm font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 w-full tracking-tight"
          />
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-200 dark:bg-white/10 text-[10px] font-black text-zinc-500">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
          <AnimatePresence>
            {searchFocused && searchRows.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-20 left-0 w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-2 z-50"
              >
                {searchRows.map((row, index) => (
                  <button key={`${row.type}-${index}`} className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5">
                    <p className="text-[10px] uppercase tracking-widest font-black text-emerald-500">{row.type}</p>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white truncate">{row.title}</p>
                    <p className="text-xs text-zinc-500 truncate">{row.subtitle}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="h-16 w-16 flex items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm dark:shadow-none relative"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {notifications.some((notification) => !notification.read) && <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-500" />}
          </button>
          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute top-full right-0 mt-3 w-96 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl p-3 z-50"
              >
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-xs uppercase tracking-widest font-black text-zinc-500">Notifications</p>
                  <button
                    onClick={() => notifications.forEach((notification) => updateDoc(doc(db, 'notifications', notification.id), { read: true }).catch(() => undefined))}
                    className="text-xs font-bold text-emerald-500"
                  >
                    Mark all read
                  </button>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-3 py-8 text-center text-sm text-zinc-500">No notifications yet.</p>
                ) : notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => updateDoc(doc(db, 'notifications', notification.id), { read: true }).catch(() => undefined)}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-white/5"
                  >
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{notification.title || notification.type}</p>
                    <p className="text-xs text-zinc-500">{notification.message || 'Open related resource'}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={toggleTheme}
          className="h-16 w-16 flex items-center justify-center rounded-2xl bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all hover:scale-105 active:scale-95 shadow-sm dark:shadow-none"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={theme}
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2 }}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.div>
          </AnimatePresence>
        </button>

        <div className="h-16 flex items-center gap-3 pl-1 group cursor-pointer" onClick={onSettingsClick}>
          <div className="hidden xl:flex flex-col items-end justify-center leading-tight">
            <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight group-hover:text-emerald-500 transition-colors whitespace-nowrap">{user?.displayName}</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center border border-zinc-800 dark:border-zinc-200 shadow-xl shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
            <span className="text-sm font-black text-emerald-500">
              {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase() || 'JD'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

```

## `src/components/Topology3D.tsx`

```tsx
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Float, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

const Node = ({ position, name, load, type }: { position: [number, number, number], name: string, load: number, type: string }) => {
  const mesh = useRef<THREE.Mesh>(null);
  
  const color = useMemo(() => {
    if (load > 80) return '#ef4444';
    if (load > 50) return '#f59e0b';
    return '#10b981';
  }, [load]);

  useFrame((state) => {
    if (mesh.current) {
      mesh.current.rotation.x = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.2;
      mesh.current.rotation.y = Math.cos(state.clock.getElapsedTime() * 0.5) * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <Sphere ref={mesh} args={[0.5, 32, 32]}>
          <MeshDistortMaterial 
            color={color} 
            speed={2} 
            distort={0.3} 
            radius={1}
            emissive={color}
            emissiveIntensity={0.5}
          />
        </Sphere>
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {name}
        </Text>
        <Text
          position={[0, -1.1, 0]}
          fontSize={0.15}
          color="#71717a"
          anchorX="center"
          anchorY="middle"
        >
          {type} • {load}%
        </Text>
      </group>
    </Float>
  );
};

const Connection = ({ start, end }: { start: [number, number, number], end: [number, number, number] }) => {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  
  return (
    <Line
      points={points}
      color="#ffffff10"
      lineWidth={1}
      transparent
      opacity={0.2}
    />
  );
};

export const Topology3D = () => {
  const nodes = [
    { id: '1', name: 'API-Gateway', pos: [0, 2, 0] as [number, number, number], load: 45, type: 'Load Balancer' },
    { id: '2', name: 'Auth-Service', pos: [-3, 0, 0] as [number, number, number], load: 82, type: 'Microservice' },
    { id: '3', name: 'Payment-Worker', pos: [3, 0, 0] as [number, number, number], load: 12, type: 'Worker' },
    { id: '4', name: 'Redis-Cache', pos: [0, -2, 0] as [number, number, number], load: 25, type: 'Database' },
    { id: '5', name: 'Postgres-DB', pos: [0, -4, 0] as [number, number, number], load: 65, type: 'Database' },
  ];

  return (
    <div className="w-full h-[600px] bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden relative">
      <div className="absolute top-6 left-6 z-10">
        <h3 className="text-lg font-medium text-white">Infrastructure Topology</h3>
        <p className="text-sm text-zinc-500">Real-time node health and connectivity</p>
      </div>
      
      <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
        <color attach="background" args={['#09090b']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <group>
          {nodes.map(node => (
            <Node key={node.id} position={node.pos} name={node.name} load={node.load} type={node.type} />
          ))}
          
          <Connection start={nodes[0].pos} end={nodes[1].pos} />
          <Connection start={nodes[0].pos} end={nodes[2].pos} />
          <Connection start={nodes[1].pos} end={nodes[3].pos} />
          <Connection start={nodes[2].pos} end={nodes[3].pos} />
          <Connection start={nodes[3].pos} end={nodes[4].pos} />
        </group>
        
        <OrbitControls enablePan={false} maxDistance={15} minDistance={5} />
      </Canvas>
    </div>
  );
};

```

## `src/firebase.ts`

```tsx
import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported } from 'firebase/analytics';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const app = initializeApp(useEmulators
  ? { ...firebaseConfig, projectId: 'demo-nexo-e2e', authDomain: 'demo-nexo-e2e.firebaseapp.com' }
  : firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:19099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 18080);
}
export const googleProvider = new GoogleAuthProvider();
export const analyticsPromise = useEmulators ? Promise.resolve(null) : isAnalyticsSupported()
  .then((supported) => (supported ? getAnalytics(app) : null))
  .catch(() => null);

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

export {
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
};

```

## `src/index.css`

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  
  --color-brand-50: #ecfdf5;
  --color-brand-100: #d1fae5;
  --color-brand-200: #a7f3d0;
  --color-brand-300: #6ee7b7;
  --color-brand-400: #34d399;
  --color-brand-500: #10b981;
  --color-brand-600: #059669;
  --color-brand-700: #047857;
  --color-brand-800: #065f46;
  --color-brand-900: #064e3b;
  --color-brand-950: #022c22;
}

@layer base {
  body {
    @apply font-sans antialiased text-zinc-900 bg-zinc-50 dark:text-zinc-100 dark:bg-zinc-950 transition-colors duration-300;
  }

  * {
    @apply border-zinc-200 dark:border-zinc-800;
  }
}

@layer components {
  .glass {
    @apply bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-white/20 dark:border-white/5;
  }
  
  .card-premium {
    @apply bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:border-white/10 transition-all duration-300;
  }

  .btn-primary {
    @apply bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-4 py-2 rounded-xl font-semibold hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2;
  }

  .btn-secondary {
    @apply bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white px-4 py-2 rounded-xl font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2;
  }
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  @apply bg-transparent;
}

::-webkit-scrollbar-thumb {
  @apply bg-zinc-300 dark:bg-zinc-800 rounded-full hover:bg-zinc-400 dark:hover:bg-zinc-700 transition-colors;
}

/* Recharts Customizations */
.recharts-cartesian-grid-horizontal line,
.recharts-cartesian-grid-vertical line {
  @apply stroke-zinc-100 dark:stroke-white/5;
}

.recharts-tooltip-cursor {
  @apply fill-zinc-100/50 dark:fill-white/5;
}

/* Animations */
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

/* Always-visible page scrollbar style for specific views */
.force-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: rgba(113, 113, 122, 0.8) transparent;
}

.force-scrollbar::-webkit-scrollbar {
  width: 10px;
}

.force-scrollbar::-webkit-scrollbar-track {
  background: transparent;
  border-left: 1px solid rgba(113, 113, 122, 0.4);
  border-right: 1px solid rgba(113, 113, 122, 0.2);
}

.force-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(113, 113, 122, 0.8);
  border-radius: 9999px;
  border: 2px solid transparent;
  background-clip: content-box;
}

.dark .force-scrollbar {
  scrollbar-color: rgba(161, 161, 170, 0.7) transparent;
}

.dark .force-scrollbar::-webkit-scrollbar-track {
  border-left: 1px solid rgba(255, 255, 255, 0.18);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.dark .force-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(161, 161, 170, 0.7);
}

```

## `src/lib/audit.ts`

```tsx
import { collection, doc, serverTimestamp, setDoc } from '../firebase';
import { db } from '../firebase';

export async function writeAuditLog(input: {
  orgId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.orgId && !input.projectId) return;
  const scope = input.orgId
    ? `organizations/${input.orgId}/auditLogs`
    : `projects/${input.projectId}/auditLogs`;
  const ref = doc(collection(db, scope));
  await setDoc(ref, {
    id: ref.id,
    orgId: input.orgId || '',
    projectId: input.projectId || '',
    userId: input.userId || '',
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId || '',
    metadata: input.metadata || {},
    timestamp: serverTimestamp(),
  });
}

```

## `src/lib/projects.ts`

```tsx
import { writeBatch } from 'firebase/firestore';
import { collection, db, doc, serverTimestamp } from '../firebase';

export async function createProject(orgId: string, name: string, environment: string) {
  const ref = doc(collection(db, `organizations/${orgId}/projects`));
  const batch = writeBatch(db);
  batch.set(doc(db, 'projects', ref.id), { orgId, lifecycle: 'active' });
  batch.set(ref, { id: ref.id, orgId, name, environment, createdAt: serverTimestamp() });
  await batch.commit();
  return ref.id;
}

```

## `src/lib/rbac.ts`

```tsx
export type AppRole = 'owner' | 'admin' | 'developer' | 'viewer';

const roleRank: Record<AppRole, number> = {
  viewer: 1,
  developer: 2,
  admin: 3,
  owner: 4,
};

const tabMinimumRole: Record<string, AppRole> = {
  dashboard: 'viewer',
  servers: 'viewer',
  analytics: 'viewer',
  logs: 'viewer',
  alerts: 'developer',
  incidents: 'developer',
  cost: 'viewer',
  risk: 'viewer',
  status: 'viewer',
  reports: 'viewer',
  help: 'viewer',
  team: 'developer',
  apiKeys: 'admin',
  audit: 'admin',
  settings: 'developer',
};

export function hasRole(userRole: AppRole | null | undefined, minRole: AppRole) {
  const role = (userRole || 'viewer') as AppRole;
  return roleRank[role] >= roleRank[minRole];
}

export function canAccessTab(userRole: AppRole | null | undefined, tab: string) {
  const minimumRole = tabMinimumRole[tab] || 'viewer';
  return hasRole(userRole, minimumRole);
}

```

## `src/lib/roles.ts`

```tsx
import type { AppRole } from './rbac';

export const ROLE_OPTIONS: Array<{ value: Exclude<AppRole, 'owner'>; label: string }> = [
  { value: 'admin', label: 'Admin' },
  { value: 'developer', label: 'Developer' },
  { value: 'viewer', label: 'Auditor' },
];

export function roleLabel(role: string | null | undefined) {
  if (role === 'owner') return 'Owner';
  return ROLE_OPTIONS.find((option) => option.value === role)?.label || 'Auditor';
}

export function roleBadgeLabel(role: string | null | undefined) {
  return roleLabel(role).toUpperCase();
}

```

## `src/lib/utils.ts`

```tsx
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isActiveServer<T extends { deletedAt?: unknown; apiKeyStatus?: string | null }>(server: T) {
  return !server.deletedAt;
}

export const formatMetricValue = (value: number, type: string) => {
  if (type === 'cpu') return `${value.toFixed(1)}%`;
  if (type === 'memory') return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (type === 'network') return `${(value / (1024 * 1024)).toFixed(2)} MB/s`;
  return value.toString();
};

```

## `src/main.tsx`

```tsx
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

document.title = 'Nexo Cloud';

localStorage.removeItem('nexo:current-org-id');
localStorage.removeItem('nexo:current-project-id');

const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

```

## `src/pages/Alerts.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, onSnapshot, db, handleFirestoreError, OperationType, orderBy, limit, doc, getDoc, setDoc, updateDoc, serverTimestamp } from '../firebase';
import { useAppStore } from '../store';
import { Alert } from '../types';

type IntegrationChannel = {
  id: 'slack' | 'email' | 'pagerduty' | 'webhooks';
  name: string;
  status: 'connected' | 'disconnected';
  source: 'firestore' | 'derived';
  updatedAt?: any;
};

export const Alerts = () => {
  const { currentProjectId, user } = useAppStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [actionMessage, setActionMessage] = useState('');
  const [showRulesPanel, setShowRulesPanel] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [channels, setChannels] = useState<IntegrationChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [alertRules, setAlertRules] = useState({
    cpuWarning: 90,
    cpuCritical: 95,
    memoryWarning: 90,
    memoryCritical: 95,
    cooldownMinutes: 15,
    emailEnabled: true,
    pushEnabled: true,
  });

  useEffect(() => {
    if (!currentProjectId) return;

    const alertsQuery = query(
      collection(db, `projects/${currentProjectId}/alerts`),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(alertsQuery, (snapshot) => {
      const alertList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alert));
      // Sort by timestamp descending
      const sorted = alertList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAlerts(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${currentProjectId}/alerts`);
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId) return;
    setChannelsLoading(true);
    const integrationsRef = collection(db, `projects/${currentProjectId}/integrations`);
    const unsubscribe = onSnapshot(integrationsRef, async (snapshot) => {
      if (snapshot.empty) {
        const bootstrap: IntegrationChannel[] = [
          { id: 'slack', name: 'Slack (#ops-alerts)', status: 'disconnected', source: 'derived' },
          { id: 'email', name: 'Email (Team)', status: alertRules.emailEnabled ? 'connected' : 'disconnected', source: 'derived' },
          { id: 'pagerduty', name: 'PagerDuty', status: 'disconnected', source: 'derived' },
          { id: 'webhooks', name: 'Webhooks', status: alertRules.pushEnabled ? 'connected' : 'disconnected', source: 'derived' },
        ];
        setChannels(bootstrap);
        try {
          await Promise.all(
            bootstrap.map((channel) =>
              setDoc(doc(db, `projects/${currentProjectId}/integrations`, channel.id), {
                id: channel.id,
                name: channel.name,
                status: channel.status,
                source: 'bootstrap',
                updatedAt: serverTimestamp(),
              }, { merge: true })
            )
          );
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `projects/${currentProjectId}/integrations`);
        } finally {
          setChannelsLoading(false);
        }
        return;
      }

      const docs = snapshot.docs.map((d) => d.data() as any);
      const byId = new Map(docs.map((d) => [String(d.id || d.name || '').toLowerCase(), d]));
      const liveChannels: IntegrationChannel[] = [
        { id: 'slack', name: 'Slack (#ops-alerts)', status: byId.get('slack')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('slack')?.updatedAt },
        { id: 'email', name: 'Email (Team)', status: byId.get('email')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('email')?.updatedAt },
        { id: 'pagerduty', name: 'PagerDuty', status: byId.get('pagerduty')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('pagerduty')?.updatedAt },
        { id: 'webhooks', name: 'Webhooks', status: byId.get('webhooks')?.status === 'connected' ? 'connected' : 'disconnected', source: 'firestore', updatedAt: byId.get('webhooks')?.updatedAt },
      ];
      setChannels(liveChannels);
      setChannelsLoading(false);
    }, (error) => {
      setChannelsLoading(false);
      handleFirestoreError(error, OperationType.LIST, `projects/${currentProjectId}/integrations`);
    });
    return () => unsubscribe();
  }, [currentProjectId, alertRules.emailEnabled, alertRules.pushEnabled]);

  useEffect(() => {
    if (!currentProjectId) return;
    const loadRules = async () => {
      setRulesLoading(true);
      try {
        const rulesRef = doc(db, `projects/${currentProjectId}/alert_rules`, 'default');
        const snap = await getDoc(rulesRef);
        if (!snap.exists()) return;
        const data = snap.data() as any;
        setAlertRules((prev) => ({
          cpuWarning: Number(data?.cpuWarning ?? prev.cpuWarning),
          cpuCritical: Number(data?.cpuCritical ?? prev.cpuCritical),
          memoryWarning: Number(data?.memoryWarning ?? prev.memoryWarning),
          memoryCritical: Number(data?.memoryCritical ?? prev.memoryCritical),
          cooldownMinutes: Number(data?.cooldownMinutes ?? prev.cooldownMinutes),
          emailEnabled: Boolean(data?.emailEnabled ?? prev.emailEnabled),
          pushEnabled: Boolean(data?.pushEnabled ?? prev.pushEnabled),
        }));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `projects/${currentProjectId}/alert_rules/default`);
      } finally {
        setRulesLoading(false);
      }
    };
    loadRules();
  }, [currentProjectId]);

  const filteredAlerts = alerts.filter(alert => {
    if (activeFilter === 'all') return true;
    return alert.status === activeFilter;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  const handleConfigureRules = () => {
    setShowRulesPanel((prev) => !prev);
    setActionMessage('');
  };

  const handleIntegrations = () => {
    const connectedCount = channels.filter((c) => c.status === 'connected').length;
    if (connectedCount === 0) {
      setActionMessage('No live notification channels connected. Configure integration documents under this project.');
      return;
    }
    const connectedNames = channels.filter((c) => c.status === 'connected').map((c) => c.name).join(', ');
    setActionMessage(`Live channels connected (${connectedCount}): ${connectedNames}`);
  };

  const handleSaveRules = async () => {
    if (!currentProjectId) return;
    setRulesSaving(true);
    try {
      const payload = {
        ...alertRules,
        cpuWarning: Math.min(Math.max(alertRules.cpuWarning, 1), 100),
        cpuCritical: Math.min(Math.max(alertRules.cpuCritical, 1), 100),
        memoryWarning: Math.min(Math.max(alertRules.memoryWarning, 1), 100),
        memoryCritical: Math.min(Math.max(alertRules.memoryCritical, 1), 100),
        cooldownMinutes: Math.min(Math.max(alertRules.cooldownMinutes, 1), 120),
        updatedAt: serverTimestamp(),
      };
      if (payload.cpuWarning > payload.cpuCritical || payload.memoryWarning > payload.memoryCritical) {
        setActionMessage('Warning threshold must be less than or equal to critical threshold.');
        return;
      }
      await setDoc(doc(db, `projects/${currentProjectId}/alert_rules`, 'default'), payload, { merge: true });
      setActionMessage('Alert rules saved. New alerts will use these thresholds.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${currentProjectId}/alert_rules/default`);
    } finally {
      setRulesSaving(false);
    }
  };

  const handleAcknowledge = async (alert: Alert) => {
    if (!currentProjectId || !alert.id) return;
    await updateDoc(doc(db, `projects/${currentProjectId}/alerts`, alert.id), {
      status: 'acknowledged',
      acknowledgedBy: user?.uid || '',
      acknowledgedAt: serverTimestamp(),
    });
    setActionMessage('Alert acknowledged.');
  };

  const handleResolve = async (alert: Alert) => {
    if (!currentProjectId || !alert.id) return;
    await updateDoc(doc(db, `projects/${currentProjectId}/alerts`, alert.id), {
      status: 'resolved',
      resolvedBy: user?.uid || '',
      resolvedAt: serverTimestamp(),
    });
    setActionMessage('Alert resolved.');
  };

  const handleEscalate = async (alert: Alert) => {
    if (!currentProjectId || !alert.id) return;
    const incidentRef = doc(collection(db, `projects/${currentProjectId}/incidents`));
    const now = new Date().toISOString();
    await setDoc(incidentRef, {
      id: incidentRef.id,
      projectId: currentProjectId,
      serverId: alert.serverId || '',
      title: alert.message,
      summary: `Escalated from alert ${alert.id}.`,
      severity: alert.severity,
      status: 'investigating',
      sourceAlertId: alert.id,
      publicVisible: alert.severity === 'critical',
      timeline: [{
        status: 'investigating',
        message: 'Incident opened from alert.',
        userId: user?.uid || '',
        timestamp: now,
      }],
      createdAt: now,
      updatedAt: now,
    });
    setActionMessage('Alert escalated into an incident.');
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Alert Management</h1>
          <p className="text-zinc-500 mt-1">Monitor and respond to system incidents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfigureRules}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 px-4 py-2 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Configure Rules
          </button>
          <button
            onClick={handleIntegrations}
            className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors"
          >
            Integrations
          </button>
        </div>
      </div>
      {actionMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-2 text-sm">
          {actionMessage}
        </div>
      )}
      {showRulesPanel && (
        <div className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Alert Rules</h3>
            {rulesLoading ? <span className="text-xs text-zinc-500">Loading...</span> : null}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <NumberField label="CPU Warning %" value={alertRules.cpuWarning} onChange={(value) => setAlertRules((prev) => ({ ...prev, cpuWarning: value }))} />
            <NumberField label="CPU Critical %" value={alertRules.cpuCritical} onChange={(value) => setAlertRules((prev) => ({ ...prev, cpuCritical: value }))} />
            <NumberField label="Cooldown (min)" value={alertRules.cooldownMinutes} onChange={(value) => setAlertRules((prev) => ({ ...prev, cooldownMinutes: value }))} />
            <NumberField label="Memory Warning %" value={alertRules.memoryWarning} onChange={(value) => setAlertRules((prev) => ({ ...prev, memoryWarning: value }))} />
            <NumberField label="Memory Critical %" value={alertRules.memoryCritical} onChange={(value) => setAlertRules((prev) => ({ ...prev, memoryCritical: value }))} />
          </div>
          <div className="flex items-center gap-6 pt-1">
            <ToggleField label="Email notifications" checked={alertRules.emailEnabled} onClick={() => setAlertRules((prev) => ({ ...prev, emailEnabled: !prev.emailEnabled }))} />
            <ToggleField label="Push notifications" checked={alertRules.pushEnabled} onClick={() => setAlertRules((prev) => ({ ...prev, pushEnabled: !prev.pushEnabled }))} />
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSaveRules}
              disabled={rulesSaving}
              className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-50"
            >
              {rulesSaving ? 'Saving...' : 'Save Rules'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-white/5 pb-4">
            <FilterTab label="All Alerts" count={alerts.length} active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
            <FilterTab label="Active" count={alerts.filter(a => a.status === 'active').length} active={activeFilter === 'active'} onClick={() => setActiveFilter('active')} />
            <FilterTab label="Resolved" count={alerts.filter(a => a.status === 'resolved').length} active={activeFilter === 'resolved'} onClick={() => setActiveFilter('resolved')} />
          </div>

          <div className="space-y-3">
            {filteredAlerts.length > 0 ? (
              filteredAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => handleAcknowledge(alert)}
                  onResolve={() => handleResolve(alert)}
                  onEscalate={() => handleEscalate(alert)}
                />
              ))
            ) : (
              <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-white/5 rounded-2xl">
                <Bell className="w-12 h-12 text-zinc-300 dark:text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500 text-sm">No alerts found matching your criteria.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Alert Distribution</h3>
            <div className="space-y-4">
              <SeverityStat label="Critical" count={criticalCount} color="bg-red-500" />
              <SeverityStat label="Warning" count={warningCount} color="bg-amber-500" />
              <SeverityStat label="Info" count={infoCount} color="bg-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none">
            <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Notification Channels</h3>
            <div className="space-y-4">
              {channelsLoading ? (
                <p className="text-xs text-zinc-500">Loading channels...</p>
              ) : channels.length === 0 ? (
                <p className="text-xs text-zinc-500">No channel documents found.</p>
              ) : (
                channels.map((channel) => (
                  <ChannelItem key={channel.id} name={channel.name} status={channel.status} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const FilterTab = ({ label, count, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
      active ? "bg-zinc-100 dark:bg-white/10 text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
    )}
  >
    {label}
    <span className={cn(
      "text-[10px] px-1.5 py-0.5 rounded-md font-bold",
      active ? "bg-emerald-500 text-zinc-950" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-500"
    )}>
      {count}
    </span>
  </button>
);

const AlertCard = ({
  alert,
  onAcknowledge,
  onResolve,
  onEscalate,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
  onEscalate: () => void;
}) => {
  const { severity, message, timestamp, status } = alert;
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl p-5 hover:border-zinc-300 dark:hover:border-white/10 transition-all group cursor-pointer shadow-sm dark:shadow-none">
    <div className="flex items-start gap-4">
      <div className={cn(
        "p-2 rounded-lg",
        severity === 'critical' ? 'bg-red-500/10 text-red-500' : 
        severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
      )}>
        {severity === 'critical' ? <AlertTriangle className="w-5 h-5" /> : 
         severity === 'warning' ? <Bell className="w-5 h-5" /> : <Info className="w-5 h-5" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
              status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
            )}>
              {status}
            </span>
          </div>
          <span className="text-xs text-zinc-500">{Number.isNaN(date.getTime()) ? 'Live' : date.toLocaleString()}</span>
        </div>
        <p className="text-sm text-zinc-700 dark:text-zinc-200 font-medium">{message}</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={onAcknowledge}
            disabled={status !== 'active'}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40"
          >
            Acknowledge
          </button>
          <button
            onClick={onResolve}
            disabled={status === 'resolved'}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-[11px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white disabled:opacity-40"
          >
            Resolve
          </button>
          <button
            onClick={onEscalate}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 text-[11px] font-black"
          >
            Escalate
          </button>
        </div>
      </div>
      <div className="p-2 text-zinc-500 opacity-0 group-hover:opacity-100">
        <ArrowRight className="w-4 h-4" />
      </div>
    </div>
  </div>
  );
};

const SeverityStat = ({ label, count, color }: any) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    </div>
    <span className="text-xs font-mono text-zinc-500">{count}</span>
  </div>
);

const ChannelItem = ({ name, status }: any) => (
  <div className="flex items-center justify-between">
    <span className="text-xs text-zinc-500 dark:text-zinc-400">{name}</span>
    <div className={cn(
      "w-1.5 h-1.5 rounded-full",
      status === 'connected' ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-700'
    )} />
  </div>
);

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) => (
  <label className="space-y-1">
    <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white"
    />
  </label>
);

const ToggleField = ({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) => (
  <button type="button" onClick={onClick} className="flex items-center gap-2">
    <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
    <div className={cn("w-10 h-5 rounded-full relative transition-colors", checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}>
      <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", checked ? "left-5" : "left-0.5")} />
    </div>
  </button>
);

```

## `src/pages/Analytics.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Calendar,
  ChevronDown,
  Activity,
  Database,
  ArrowUpRight,
  Zap,
  Server
} from 'lucide-react';
import { MetricChart } from '../components/MetricChart';
import { cn, isActiveServer } from '../lib/utils';
import { auth, collection, query, orderBy, limit, onSnapshot, db, where, handleFirestoreError, OperationType } from '../firebase';
import { Server as ServerType, ServerMetric } from '../types';
import { useAppStore } from '../store';
import { motion } from 'framer-motion';

export const Analytics = () => {
  const { currentProjectId } = useAppStore();
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [memData, setMemData] = useState<any[]>([]);
  const [netData, setNetData] = useState<any[]>([]);
  const [diskData, setDiskData] = useState<any[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRange, setSelectedRange] = useState<'24h' | '7d' | 'custom'>('24h');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isDeepScanning, setIsDeepScanning] = useState(false);
  const [deepScanResult, setDeepScanResult] = useState<{
    anomaliesDetected: number;
    riskLevel: string;
    findings: { message: string; severity: 'warning' | 'critical' }[];
    lookbackHours: number;
  } | null>(null);
  const [resourceLoadByServer, setResourceLoadByServer] = useState<Record<string, number>>({});
  const [showAllResources, setShowAllResources] = useState(false);

  // Fetch servers for the current project
  useEffect(() => {
    if (!currentProjectId) return;

    const q = query(
      collection(db, 'servers'),
      where('projectId', '==', currentProjectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServerType))
        .filter(isActiveServer);
      setServers(serverList);
      setSelectedServerId((prev) => {
        if (serverList.length === 0) return '';
        if (prev && serverList.some((srv) => srv.id === prev)) return prev;
        return serverList[0].id;
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'servers');
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  // Fetch metrics with selectable time window
  useEffect(() => {
    if (!selectedServerId) {
      setCpuData([]);
      setMemData([]);
      setNetData([]);
      setDiskData([]);
      return;
    }

    const q = query(
      collection(db, `servers/${selectedServerId}/metrics`),
      orderBy('timestamp', 'desc'),
      limit(400)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const metrics = snapshot.docs
        .map(doc => doc.data() as ServerMetric)
        .filter((m) => {
          const ts = typeof m.timestamp === 'string' ? new Date(m.timestamp) : (m.timestamp as any).toDate();
          if (selectedRange === '24h') {
            return ts >= new Date(Date.now() - 24 * 60 * 60 * 1000);
          }
          if (selectedRange === '7d') {
            return ts >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          }
          if (selectedRange === 'custom' && selectedDate) {
            const year = ts.getFullYear();
            const month = String(ts.getMonth() + 1).padStart(2, '0');
            const day = String(ts.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}` === selectedDate;
          }
          return true;
        })
        .reverse();
      
      setCpuData(metrics.map(m => ({ 
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : (m.timestamp as any).toDate(), 
        value: m.cpu 
      })));
      setMemData(metrics.map(m => ({ 
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : (m.timestamp as any).toDate(), 
        value: m.memory 
      })));
      setNetData(metrics.map(m => ({ 
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : (m.timestamp as any).toDate(), 
        value: m.network 
      })));
      setDiskData(metrics.map(m => ({
        timestamp: typeof m.timestamp === 'string' ? new Date(m.timestamp) : (m.timestamp as any).toDate(),
        value: m.disk || 0
      })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `servers/${selectedServerId}/metrics`);
      setCpuData([]);
      setMemData([]);
      setNetData([]);
      setDiskData([]);
    });

    return () => unsubscribe();
  }, [selectedServerId, selectedRange, selectedDate]);

  // Live server loads from latest metric per server (real wiring, no random)
  useEffect(() => {
    if (servers.length === 0) {
      setResourceLoadByServer({});
      return;
    }

    const unsubscribers = servers.map((srv) => {
      const latestMetricQuery = query(
        collection(db, `servers/${srv.id}/metrics`),
        orderBy('timestamp', 'desc'),
        limit(1)
      );

      return onSnapshot(latestMetricQuery, (snapshot) => {
        const metric = snapshot.docs[0]?.data() as ServerMetric | undefined;
        if (!metric) {
          setResourceLoadByServer(prev => ({ ...prev, [srv.id]: 0 }));
          return;
        }

        const normalizedNetwork = Math.min(Math.max(Number(metric.network || 0) / 10, 0), 100);
        const load = Math.round(
          Number(metric.cpu || 0) * 0.45 +
          Number(metric.memory || 0) * 0.45 +
          normalizedNetwork * 0.1
        );
        setResourceLoadByServer(prev => ({ ...prev, [srv.id]: Math.min(Math.max(load, 0), 100) }));
      }, () => {
        setResourceLoadByServer(prev => ({ ...prev, [srv.id]: 0 }));
      });
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [servers]);

  const handleExport = () => {
    setIsExporting(true);
    try {
      const rows = cpuData.map((cpuPoint, idx) => {
        const ts = cpuPoint.timestamp instanceof Date ? cpuPoint.timestamp.toISOString() : new Date(cpuPoint.timestamp).toISOString();
        return [
          ts,
          cpuPoint.value ?? '',
          memData[idx]?.value ?? '',
          netData[idx]?.value ?? '',
          diskData[idx]?.value ?? '',
        ];
      });
      const csv = [
        ['timestamp', 'cpu', 'memory', 'network', 'disk'].join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-${selectedServerId || 'server'}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setIsExporting(false), 400);
    }
  };

  const handleDeepScan = async () => {
    const targetServerId = selectedServerId || servers[0]?.id || '';
    if (!targetServerId) return;
    setIsDeepScanning(true);
    try {
      const lookbackHours = selectedRange === '7d' ? 168 : 24;
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const response = await fetch('/api/deep-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ serverId: targetServerId, lookbackHours }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || 'Deep scan failed');
      const scan = payload?.scan;
      setDeepScanResult({
        anomaliesDetected: Number(scan?.anomaliesDetected || 0),
        riskLevel: String(scan?.riskLevel || 'none'),
        findings: Array.isArray(scan?.findings) ? scan.findings : [],
        lookbackHours: Number(scan?.lookbackHours || lookbackHours),
      });
    } catch (error) {
      setDeepScanResult({
        anomaliesDetected: 0,
        riskLevel: 'unknown',
        findings: [{ message: error instanceof Error ? error.message : 'Deep scan failed', severity: 'warning' }],
        lookbackHours: selectedRange === '7d' ? 168 : 24,
      });
    } finally {
      setIsDeepScanning(false);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-10 space-y-12 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Performance Intelligence</span>
          </div>
          <h1 className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter">
            System <span className="text-zinc-400">Analytics</span>
          </h1>
          <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-xl font-medium leading-relaxed">
            Real-time telemetry and predictive resource analysis across your global infrastructure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Server Selector */}
          <div className="relative group">
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 text-zinc-900 dark:text-white pl-12 pr-12 py-3.5 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/10 shadow-sm dark:shadow-none w-64"
            >
              {servers.length === 0 && <option value="">No Servers Found</option>}
              {servers.map(server => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            <Server className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors" />
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 px-3 py-2 rounded-2xl shadow-sm dark:shadow-none">
            <Calendar className="w-4 h-4" />
            <select
              value={selectedRange}
              onChange={(e) => setSelectedRange(e.target.value as '24h' | '7d' | 'custom')}
              className="bg-transparent text-sm font-black text-zinc-500 dark:text-zinc-300 outline-none"
            >
              <option value="24h">Last 24h</option>
              <option value="7d">Last 7d</option>
              <option value="custom">Custom date</option>
            </select>
            {selectedRange === 'custom' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-zinc-700 dark:text-zinc-200 border-l border-zinc-200 dark:border-white/10 pl-2 outline-none"
                aria-label="Choose analytics date"
              />
            )}
          </div>
          
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-8 py-3.5 rounded-2xl text-sm font-black hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-zinc-900/20 dark:shadow-white/10 disabled:opacity-50"
          >
            {isExporting ? (
              <Activity className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {isExporting ? 'Preparing...' : 'Export Data'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Main Charts Area */}
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="xl:col-span-2 space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div variants={item}>
              <MetricChart 
                data={cpuData} 
                type="cpu" 
                title="Processor Load" 
                color="#10b981" 
              />
            </motion.div>
            <motion.div variants={item}>
              <MetricChart 
                data={memData} 
                type="memory" 
                title="Memory Allocation" 
                color="#3b82f6" 
              />
            </motion.div>
            <motion.div variants={item}>
              <MetricChart 
                data={netData} 
                type="network" 
                title="Network Throughput" 
                color="#8b5cf6" 
              />
            </motion.div>
            <motion.div variants={item}>
              <MetricChart 
                data={diskData} 
                type="disk" 
                title="Disk I/O Performance" 
                color="#f59e0b" 
              />
            </motion.div>
          </div>
        </motion.div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
          {/* Top Resources */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-xl dark:shadow-none backdrop-blur-xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] pointer-events-none">
              <Database className="w-32 h-32" />
            </div>
            
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Top Resources</h3>
              <button
                onClick={() => setShowAllResources((prev) => !prev)}
                className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline"
              >
                {showAllResources ? 'Show Top 5' : 'View All'}
              </button>
            </div>
            
            <div className="space-y-6">
              {servers.length > 0 ? (
                (showAllResources ? servers : servers.slice(0, 5)).map((server, idx) => (
                  <ResourceItem key={server.id} name={server.name} load={resourceLoadByServer[server.id] ?? 0} delay={idx * 0.1} />
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm font-bold text-zinc-500 italic">No resources detected.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Anomaly Insights */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-zinc-900 dark:bg-white rounded-[2.5rem] p-10 text-white dark:text-zinc-950 shadow-2xl relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-white/10 dark:bg-zinc-950/10 rounded-2xl">
                  <Activity className="w-5 h-5 text-emerald-400 dark:text-emerald-600" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Anomaly Insights</h3>
              </div>
              
              <p className="text-2xl font-black tracking-tighter mb-6 leading-tight">
                {deepScanResult ? (
                  deepScanResult.anomaliesDetected > 0 ? (
                    <>
                      <span className="text-emerald-400 dark:text-emerald-600">{deepScanResult.anomaliesDetected}</span> anomaly patterns detected in the last {deepScanResult.lookbackHours}h.
                    </>
                  ) : (
                    <>
                      No critical <span className="text-emerald-400 dark:text-emerald-600">deviations</span> detected in the last {deepScanResult.lookbackHours}h.
                    </>
                  )
                ) : (
                  <>
                    No critical <span className="text-emerald-400 dark:text-emerald-600">deviations</span> detected in the current window.
                  </>
                )}
              </p>
              
              <button
                onClick={handleDeepScan}
                disabled={servers.length === 0 || isDeepScanning}
                className="flex items-center gap-3 text-xs font-black uppercase tracking-widest group/btn disabled:opacity-50"
              >
                {isDeepScanning ? 'Scanning...' : 'Run Deep Scan'}
                <ArrowUpRight className="w-4 h-4 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
              </button>

              {deepScanResult?.findings?.length ? (
                <div className="mt-4 space-y-2">
                  {deepScanResult.findings.slice(0, 2).map((finding, idx) => (
                    <p key={idx} className="text-xs font-semibold opacity-80">
                      {finding.severity.toUpperCase()}: {finding.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const ResourceItem = ({ name, load, delay }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay }}
    className="group/item"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-black text-zinc-700 dark:text-zinc-300 group-hover/item:text-emerald-500 transition-colors tracking-tight">{name}</span>
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{load}% Load</span>
    </div>
    <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden p-0.5">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${load}%` }}
        transition={{ duration: 1, delay }}
        className={cn(
          "h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]",
          load > 80 ? "bg-red-500" : load > 50 ? "bg-amber-500" : "bg-emerald-500"
        )} 
      />
    </div>
  </motion.div>
);

```

## `src/pages/ApiKeys.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { KeyRound, Copy, Ban, Check } from 'lucide-react';
import { collection, db, doc, onSnapshot, query, serverTimestamp, setDoc, where } from '../firebase';
import { Server } from '../types';
import { useAppStore } from '../store';
import { writeAuditLog } from '../lib/audit';
import { cn, isActiveServer } from '../lib/utils';

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function makeSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return `nexo_live_${Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export const ApiKeys = () => {
  const { currentOrgId, currentProjectId, user } = useAppStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServerId, setSelectedServerId] = useState('');
  const [keyName, setKeyName] = useState('Primary ingestion key');
  const [secret, setSecret] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) {
      setServers([]);
      setSelectedServerId('');
      return;
    }
    const serversQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serversQuery, (snapshot) => {
      const rows = snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as Server)).filter(isActiveServer);
      setServers(rows);
      if (!selectedServerId && rows[0]) setSelectedServerId(rows[0].id);
      if (selectedServerId && !rows.some((server) => server.id === selectedServerId)) setSelectedServerId(rows[0]?.id || '');
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load API key servers', error);
      setServers([]);
      setErrorMessage('Could not load servers for API key management. Check your role and Firestore rules.');
    });
  }, [currentProjectId, selectedServerId]);

  const generate = async () => {
    if (!selectedServerId || !currentProjectId || !user?.uid) return;
    setErrorMessage('');
    const nextSecret = makeSecret();
    const apiKeyHash = await sha256Hex(nextSecret);
    await setDoc(doc(db, 'servers', selectedServerId), {
      apiKeyHash,
      apiKeyStatus: 'active',
      apiKeyName: keyName.trim() || 'Ingestion key',
      apiKeyLastUsed: null,
      apiKeyCreatedAt: serverTimestamp(),
    }, { merge: true });
    await writeAuditLog({ orgId: currentOrgId, projectId: currentProjectId, userId: user.uid, action: 'api_key_generated', resource: 'server', resourceId: selectedServerId, metadata: { name: keyName } });
    setSecret(nextSecret);
  };

  const revoke = async (server: Server) => {
    if (!user?.uid) return;
    await setDoc(doc(db, 'servers', server.id), { apiKeyStatus: 'revoked', apiKeyRevokedAt: serverTimestamp() }, { merge: true });
    await writeAuditLog({ orgId: currentOrgId, projectId: currentProjectId, userId: user.uid, action: 'api_key_revoked', resource: 'server', resourceId: server.id });
  };

  const copySecret = async () => {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><KeyRound className="w-4 h-4" />API Key Management</div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">API Keys</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">Generate, name, and revoke ingestion keys. Secrets are displayed exactly once.</p>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
        <input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white" />
        <select value={selectedServerId} onChange={(event) => setSelectedServerId(event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
          {servers.map((server) => <option key={server.id} value={server.id}>{server.name}</option>)}
        </select>
        <button onClick={generate} disabled={!selectedServerId} className="bg-emerald-500 text-zinc-950 px-5 py-3 rounded-xl font-black disabled:opacity-50">Generate Key</button>
      </div>
      {servers.length === 0 && !errorMessage && (
        <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No servers in the active project yet. Register a server first.</div>
      )}

      {secret && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 space-y-3">
          <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Copy this key now. It will not be shown again.</p>
          <button onClick={copySecret} className="w-full text-left bg-zinc-950 text-emerald-400 rounded-xl p-4 font-mono text-xs flex items-center justify-between gap-3">
            <span className="truncate">{secret}</span>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {servers.map((server) => (
          <div key={server.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-black text-zinc-900 dark:text-white">{server.name}</p>
              <p className="text-xs text-zinc-500">{(server as any).apiKeyName || 'Ingestion key'} · {(server as any).apiKeyLastUsed ? 'used' : 'never used'}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-[10px] uppercase tracking-widest font-black', server.apiKeyStatus === 'active' ? 'text-emerald-500' : 'text-red-500')}>{server.apiKeyStatus || 'legacy'}</span>
              <button aria-label={`Revoke key for ${server.name}`} onClick={() => revoke(server)} className="text-red-500 hover:bg-red-500/10 rounded-xl p-2"><Ban className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

```

## `src/pages/AuditLogs.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { ClipboardList, Download } from 'lucide-react';
import { collection, db, limit, onSnapshot, orderBy, query } from '../firebase';
import { useAppStore } from '../store';

type AuditRow = {
  id: string;
  timestamp?: any;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
};

const toDate = (value: any) => value?.toDate ? value.toDate() : value ? new Date(value) : null;

export const AuditLogs = () => {
  const { currentOrgId } = useAppStore();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentOrgId) return;
    const auditQuery = query(collection(db, `organizations/${currentOrgId}/auditLogs`), orderBy('timestamp', 'desc'), limit(250));
    return onSnapshot(auditQuery, (snapshot) => {
      setRows(snapshot.docs.map((auditDoc) => ({ id: auditDoc.id, ...auditDoc.data() } as AuditRow)));
      setErrorMessage('');
    }, (error) => {
      console.error('Audit log listener failed', error);
      setRows([]);
      setErrorMessage('Could not load audit logs for this account.');
    });
  }, [currentOrgId]);

  const exportCsv = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Resource ID', 'Metadata'],
      ...rows.map((row) => [
        toDate(row.timestamp)?.toISOString() || '',
        row.userId || '',
        row.action,
        row.resource,
        row.resourceId || '',
        JSON.stringify(row.metadata || {}),
      ]),
    ].map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexo-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><ClipboardList className="w-4 h-4" />Security Audit</div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Audit Logs</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Administrative and security-sensitive actions are recorded here.</p>
        </div>
        <button onClick={exportCsv} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center gap-2"><Download className="w-4 h-4" />Export CSV</button>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">No audit events recorded yet.</div>
        ) : rows.map((row) => {
          const date = toDate(row.timestamp);
          return (
            <div key={row.id} className="p-5 border-b border-zinc-200 dark:border-white/10 last:border-b-0 grid grid-cols-1 md:grid-cols-[180px_1fr_1fr] gap-3">
              <span className="text-xs text-zinc-500">{date ? date.toLocaleString() : 'Pending timestamp'}</span>
              <div>
                <p className="font-black text-zinc-900 dark:text-white">{row.action.replace(/_/g, ' ')}</p>
                <p className="text-xs text-zinc-500">{row.resource} {row.resourceId ? `· ${row.resourceId}` : ''}</p>
              </div>
              <code className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-950 rounded-xl p-3 overflow-x-auto">{JSON.stringify(row.metadata || {})}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
};

```

## `src/pages/Cost.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PieChart as PieChartIcon, 
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Cloud,
  HardDrive,
  Network,
  Download,
  Calendar,
  ChevronDown
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { cn, isActiveServer } from '../lib/utils';
import { collection, query, where, onSnapshot, db, orderBy, limit } from '../firebase';
import { useAppStore } from '../store';
import { Server as ServerType, ServerMetric } from '../types';

export const Cost = () => {
  const { currentProjectId } = useAppStore();
  const [servers, setServers] = useState<ServerType[]>([]);
  const [livePieData, setLivePieData] = useState([
    { name: 'Compute', value: 0, color: '#10b981' },
    { name: 'Storage', value: 0, color: '#3b82f6' },
    { name: 'Networking', value: 0, color: '#8b5cf6' },
  ]);
  const [liveBarData, setLiveBarData] = useState([
    { month: 'Oct', amount: 0 },
    { month: 'Nov', amount: 0 },
    { month: 'Dec', amount: 0 },
    { month: 'Jan', amount: 0 },
    { month: 'Feb', amount: 0 },
    { month: 'Mar', amount: 0 },
  ]);

  useEffect(() => {
    if (!currentProjectId) return;

    const q = query(
      collection(db, 'servers'),
      where('projectId', '==', currentProjectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServerType))
        .filter(isActiveServer);
      setServers(serverList);
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  const [avgCostPerServer, setAvgCostPerServer] = useState(45);
  const [costMessage, setCostMessage] = useState('');
  const hasConnectedServers = servers.length > 0;

  const toDate = (ts: any): Date => {
    if (!ts) return new Date();
    if (ts instanceof Date) return ts;
    if (typeof ts?.toDate === 'function') return ts.toDate();
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
    return new Date();
  };

  useEffect(() => {
    if (!servers.length) {
      setLivePieData([
        { name: 'Compute', value: 0, color: '#10b981' },
        { name: 'Storage', value: 0, color: '#3b82f6' },
        { name: 'Networking', value: 0, color: '#8b5cf6' },
      ]);
      setLiveBarData([
        { month: 'Oct', amount: 0 },
        { month: 'Nov', amount: 0 },
        { month: 'Dec', amount: 0 },
        { month: 'Jan', amount: 0 },
        { month: 'Feb', amount: 0 },
        { month: 'Mar', amount: 0 },
      ]);
      return;
    }

    const metricsByServer: Record<string, ServerMetric[]> = {};

    const recompute = () => {
      const serverIds = servers.map((s) => s.id);

      const latestMetrics = serverIds
        .map((serverId) => metricsByServer[serverId]?.[0])
        .filter(Boolean) as ServerMetric[];

      const avgCpu = latestMetrics.length
        ? latestMetrics.reduce((sum, m) => sum + (m.cpu || 0), 0) / latestMetrics.length
        : 0;
      const avgMemory = latestMetrics.length
        ? latestMetrics.reduce((sum, m) => sum + (m.memory || 0), 0) / latestMetrics.length
        : 0;
      const avgNetwork = latestMetrics.length
        ? latestMetrics.reduce((sum, m) => sum + (m.network || 0), 0) / latestMetrics.length
        : 0;

      const resourceTotal = avgCpu + avgMemory + avgNetwork;
      const pie = resourceTotal > 0
        ? [
            { name: 'Compute', value: Math.round((avgCpu / resourceTotal) * 100), color: '#10b981' },
            { name: 'Storage', value: Math.round((avgMemory / resourceTotal) * 100), color: '#3b82f6' },
            { name: 'Networking', value: Math.round((avgNetwork / resourceTotal) * 100), color: '#8b5cf6' },
          ]
        : [
            { name: 'Compute', value: 0, color: '#10b981' },
            { name: 'Storage', value: 0, color: '#3b82f6' },
            { name: 'Networking', value: 0, color: '#8b5cf6' },
          ];
      setLivePieData(pie);

      const now = new Date();
      const months = Array.from({ length: 6 }, (_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return { key, month: d.toLocaleString('en-US', { month: 'short' }) };
      });

      const bar = months.map((m) => {
        let amount = 0;
        for (const serverId of serverIds) {
          const metrics = metricsByServer[serverId] || [];
          const monthMetrics = metrics.filter((metric) => {
            const dt = toDate(metric.timestamp);
            const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
            return key === m.key;
          });
          const avgUtilization = monthMetrics.length
            ? monthMetrics.reduce((sum, metric) => sum + (((metric.cpu || 0) + (metric.memory || 0) + (metric.network || 0)) / 3), 0) / monthMetrics.length
            : 0;
          amount += avgCostPerServer * (avgUtilization / 100);
        }
        return { month: m.month, amount: Number(amount.toFixed(2)) };
      });
      setLiveBarData(bar);
    };

    const unsubscribers = servers.map((server) => {
      const metricsQuery = query(
        collection(db, `servers/${server.id}/metrics`),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      return onSnapshot(metricsQuery, (snapshot) => {
        metricsByServer[server.id] = snapshot.docs.map((doc) => doc.data() as ServerMetric);
        recompute();
      });
    });

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [servers, avgCostPerServer]);

  const monthlySpend = liveBarData[liveBarData.length - 1]?.amount ?? 0;
  const lastMonthSpend = liveBarData[liveBarData.length - 2]?.amount ?? 0;
  const diff = monthlySpend - lastMonthSpend;
  const percentChange = lastMonthSpend > 0 ? ((diff / lastMonthSpend) * 100).toFixed(1) : "0";
  const projectedSavings = monthlySpend * 0.1;
  const effectiveAvgCost = hasConnectedServers ? avgCostPerServer : 0;

  const handleDownloadInvoice = () => {
    const csvRows = [
      ['Month', 'Amount'],
      ...liveBarData.map((row) => [row.month, row.amount.toString()]),
    ];
    const csv = csvRows.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nexo-invoice-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setCostMessage('Invoice CSV downloaded.');
  };

  const handleOptimizeSpend = () => {
    if (!hasConnectedServers) {
      setCostMessage('Connect at least one server to optimize spend.');
      return;
    }
    setAvgCostPerServer((prev) => Math.max(1, Math.round(prev * 0.9)));
    setCostMessage('Applied a 10% optimization baseline to cost-per-server.');
  };

  const handleViewRecommendations = () => {
    if (!hasConnectedServers) {
      setCostMessage('No recommendations yet. Connect a server to generate cost insights.');
      return;
    }
    setCostMessage(`Recommendation: review high-utilization servers first to target about $${projectedSavings.toFixed(2)} savings.`);
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Cost Intelligence</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Predictive analytics and cloud spend optimization</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Avg Cost/Server</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-400">$</span>
              <input 
                type="number" 
                value={effectiveAvgCost}
                onChange={(e) => setAvgCostPerServer(parseInt(e.target.value) || 0)}
                disabled={!hasConnectedServers}
                className="w-12 bg-transparent border-none text-xs font-bold text-zinc-900 dark:text-white focus:outline-none disabled:text-zinc-400"
              />
            </div>
          </div>
          <button
            onClick={handleDownloadInvoice}
            className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 px-4 py-2 rounded-lg text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Invoice
          </button>
          <button
            onClick={handleOptimizeSpend}
            className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors"
          >
            Optimize Spend
          </button>
        </div>
      </div>
      {costMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-2 text-sm">
          {costMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CostMetricCard 
          title="Monthly Spend" 
          value={hasConnectedServers ? `$${monthlySpend.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00'} 
          trend={hasConnectedServers ? `${percentChange}%` : 'No data'} 
          trendUp={hasConnectedServers ? Number(percentChange) >= 0 : true} 
        />
        <CostMetricCard 
          title="Daily Average" 
          value={hasConnectedServers ? `$${(monthlySpend / 30).toFixed(2)}` : '$0.00'} 
          trend={hasConnectedServers ? `${(Number(percentChange) / 30).toFixed(1)}%` : 'No data'} 
          trendUp={true} 
        />
        <CostMetricCard 
          title="Projected Savings" 
          value={hasConnectedServers ? `$${projectedSavings.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$0.00'} 
          trend={hasConnectedServers ? 'Actionable' : 'Connect servers'} 
          trendUp={true} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">Spend by Resource Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={livePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {livePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {livePieData.map((item) => (
              <div key={item.name} className="text-center">
                <div className="text-xs text-zinc-500 mb-1">{item.name}</div>
                <div className="text-sm font-medium text-zinc-900 dark:text-white">{item.value}%</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">Historical Spend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liveBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
        <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-6">Predictive Cost Forecast</h3>
        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-xl flex items-start gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <TrendingUp className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h4 className="text-zinc-900 dark:text-white font-medium">Projected Growth Analysis</h4>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {hasConnectedServers
                ? `Based on current utilization patterns across your ${servers.length} active servers, your infrastructure costs are projected to increase by 8% next month. We recommend reviewing your compute allocation for ${servers[0]?.name || 'your primary nodes'} to optimize for cost-efficiency.`
                : 'No connected servers yet. Connect at least one server to generate predictive cost forecasting and optimization recommendations.'}
            </p>
            <button
              onClick={handleViewRecommendations}
              className="mt-4 text-sm text-blue-500 font-medium hover:text-blue-400 transition-colors"
            >
              View Optimization Recommendations →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const CostMetricCard = ({ title, value, trend, trendUp }: any) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none">
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{title}</p>
    <div className="flex items-end justify-between mt-2">
      <h4 className="text-3xl font-bold text-zinc-900 dark:text-white">{value}</h4>
      <div className={cn(
        "flex items-center gap-1 text-sm font-medium",
        trendUp ? "text-emerald-500" : "text-red-500"
      )}>
        {trendUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        {trend}
      </div>
    </div>
  </div>
);

const ServiceCostItem = ({ icon: Icon, name, amount, percentage, color }: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-zinc-500" />
        <span className="text-sm text-zinc-300">{name}</span>
      </div>
      <span className="text-sm font-bold text-white">{amount}</span>
    </div>
    <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
      <div 
        className={cn("h-full rounded-full transition-all duration-1000", color)} 
        style={{ width: `${percentage}%` }} 
      />
    </div>
  </div>
);

```

## `src/pages/Dashboard.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { MetricChart } from '../components/MetricChart';
import { 
  Activity, 
  Cpu, 
  Database, 
  Globe, 
  TrendingUp, 
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Server,
  ChevronDown
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, db, where, handleFirestoreError, OperationType } from '../firebase';
import { Metric, Alert, Server as ServerType, ServerMetric } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { motion } from 'framer-motion';
import { InviteModal } from '../components/InviteModal';
import { useAppStore } from '../store';
import { hasRole } from '../lib/rbac';

import { AreaChart, Area, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts';

export const Dashboard = () => {
  const { currentProjectId, user, userRole } = useAppStore();
  const canManageTeam = hasRole(userRole, 'admin');
  const [cpuData, setCpuData] = useState<any[]>([]);
  const [memData, setMemData] = useState<any[]>([]);
  const [netData, setNetData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string | 'all'>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Fetch servers for the current project
  useEffect(() => {
    if (!currentProjectId) return;

    const q = query(
      collection(db, 'servers'),
      where('projectId', '==', currentProjectId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const serverList = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as ServerType))
        .filter(isActiveServer);
      setServers(serverList);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'servers');
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  // Fetch alerts for the current project
  useEffect(() => {
    if (!currentProjectId) return;

    const q = query(
      collection(db, `projects/${currentProjectId}/alerts`),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const alertList = snapshot.docs.map(doc => doc.data() as Alert);
      setAlerts(alertList);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `projects/${currentProjectId}/alerts`);
    });

    return () => unsubscribe();
  }, [currentProjectId]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('recipientUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    });
    return () => unsub();
  }, [user?.uid]);

  // Fetch real metrics
  useEffect(() => {
    if (!currentProjectId) return;

    let q;
    if (selectedServerId === 'all') {
      const activeServer = servers.find(s => s.status === 'online');
      if (!activeServer) {
        setCpuData([]);
        setMemData([]);
        setNetData([]);
        return;
      }
      q = query(
        collection(db, `servers/${activeServer.id}/metrics`),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    } else {
      q = query(
        collection(db, `servers/${selectedServerId}/metrics`),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const metrics = snapshot.docs.map(doc => doc.data() as ServerMetric).reverse();
      
      const formatTimestamp = (ts: any) => {
        if (ts instanceof Date) return ts;
        if (typeof ts === 'string') return new Date(ts);
        if (ts?.toDate) return ts.toDate();
        return new Date();
      };

      setCpuData(metrics.map(m => ({ 
        timestamp: formatTimestamp(m.timestamp), 
        value: m.cpu 
      })));
      setMemData(metrics.map(m => ({ 
        timestamp: formatTimestamp(m.timestamp), 
        value: m.memory 
      })));
      setNetData(metrics.map(m => ({ 
        timestamp: formatTimestamp(m.timestamp), 
        value: m.network 
      })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, selectedServerId === 'all' ? 'metrics' : `servers/${selectedServerId}/metrics`);
      setCpuData([]);
      setMemData([]);
      setNetData([]);
    });

    return () => unsubscribe();
  }, [selectedServerId, currentProjectId, servers]);

  const activeNodes = servers.filter(s => s.status === 'online').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;

  const avgThroughput = netData.length > 0 
    ? (netData.reduce((acc, curr) => acc + curr.value, 0) / netData.length)
    : 0;
  const hasMetricData = netData.length > 0;
  const hasConnectedServers = servers.length > 0;
  const hasAnyInfraData = hasConnectedServers && hasMetricData;

  const throughputTrend = hasMetricData
    ? `${avgThroughput >= 0 ? '+' : ''}${avgThroughput.toFixed(1)}%`
    : 'No Data';
  const latencyValue = hasMetricData ? (netData[netData.length - 1].value / 2).toFixed(0) : '—';
  const latencyTrend = hasMetricData ? '-4.2%' : 'No Data';
  const activeNodesTrend = hasConnectedServers ? (activeNodes === servers.length ? 'Stable' : 'Degraded') : 'No Data';
  const alertTrend = hasConnectedServers
    ? (alerts.length > 0 ? 'Action Required' : 'All Clear')
    : 'No Data';

  const avgCpu = cpuData.length > 0
    ? cpuData.reduce((acc, curr) => acc + curr.value, 0) / cpuData.length
    : 0;
  const avgMemory = memData.length > 0
    ? memData.reduce((acc, curr) => acc + curr.value, 0) / memData.length
    : 0;
  const avgNetwork = netData.length > 0
    ? netData.reduce((acc, curr) => acc + curr.value, 0) / netData.length
    : 0;

  const totalResourceWeight = avgCpu + avgMemory + avgNetwork;
  const rawResourceSplit = totalResourceWeight > 0
    ? [
        { label: 'Compute Resources', value: (avgCpu / totalResourceWeight) * 100, color: 'bg-emerald-500' },
        { label: 'Storage Systems', value: (avgMemory / totalResourceWeight) * 100, color: 'bg-blue-500' },
        { label: 'Networking Fabric', value: (avgNetwork / totalResourceWeight) * 100, color: 'bg-purple-500' }
      ]
    : [
        { label: 'Compute Resources', value: 0, color: 'bg-emerald-500' },
        { label: 'Storage Systems', value: 0, color: 'bg-blue-500' },
        { label: 'Networking Fabric', value: 0, color: 'bg-purple-500' }
      ];

  const roundedResourceSplit = rawResourceSplit.map((item) => ({
    ...item,
    percentage: Math.round(item.value)
  }));
  const splitTotal = roundedResourceSplit.reduce((sum, item) => sum + item.percentage, 0);
  if (splitTotal !== 100 && roundedResourceSplit.some((item) => item.percentage > 0)) {
    let maxIndex = 0;
    for (let i = 1; i < roundedResourceSplit.length; i += 1) {
      if (roundedResourceSplit[i].percentage > roundedResourceSplit[maxIndex].percentage) {
        maxIndex = i;
      }
    }
    roundedResourceSplit[maxIndex].percentage += 100 - splitTotal;
  }

  const baselineServerCost = 45;
  const utilizationFactor = Math.min(1.5, (avgCpu + avgMemory + avgNetwork) / 300);
  const estimatedMonthlySpend = servers.length * baselineServerCost * utilizationFactor;
  const lastMonthSpend = servers.length * baselineServerCost;
  const spendDiffPercent = lastMonthSpend > 0
    ? ((estimatedMonthlySpend - lastMonthSpend) / lastMonthSpend) * 100
    : 0;
  const spendTrendUp = spendDiffPercent >= 0;
  const spendTrendLabel = `${Math.abs(spendDiffPercent).toFixed(1)}%`;
  const formattedSpend = estimatedMonthlySpend.toFixed(2).split('.');

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
            <Activity className="w-4 h-4" />
            Live Infrastructure
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">System Overview</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
            Real-time monitoring across {servers.length} nodes. System health is currently <span className="text-emerald-500 font-bold">Optimal</span>.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <select
              value={selectedServerId}
              onChange={(e) => setSelectedServerId(e.target.value)}
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white px-5 py-3 pr-12 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer shadow-sm"
            >
              <option value="all">Global Infrastructure</option>
              {servers.map(server => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-hover:text-emerald-500 transition-colors" />
          </div>

          {canManageTeam && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-6 py-3 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
            >
              Invite Team
            </button>
          )}
        </div>
      </div>

      {canManageTeam && <InviteModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
        <StatCard 
          title="Network Throughput" 
          value={hasMetricData ? `${avgThroughput.toFixed(2)}` : '—'}
          unit="MB/s"
          data={netData}
          trend={throughputTrend}
          trendTone={hasMetricData ? 'up' : 'neutral'}
          icon={Globe} 
          color="emerald" 
        />
        <StatCard 
          title="Avg Latency" 
          value={latencyValue}
          unit="ms"
          data={netData.map(d => ({ ...d, value: d.value / 2 }))}
          trend={latencyTrend}
          trendTone={hasMetricData ? 'down' : 'neutral'}
          icon={Activity} 
          color="blue" 
        />
        <StatCard 
          title="Active Nodes" 
          value={activeNodes.toString()} 
          unit={`/ ${servers.length}`}
          data={[]} // No sparkline for static count
          trend={activeNodesTrend}
          trendTone={hasConnectedServers ? 'up' : 'neutral'}
          icon={Database} 
          color="purple" 
        />
        <StatCard 
          title="Critical Alerts" 
          value={criticalAlerts.toString()} 
          unit="Active"
          data={[]}
          trend={alertTrend}
          trendTone={!hasConnectedServers ? 'neutral' : criticalAlerts === 0 ? 'up' : 'down'}
          icon={AlertCircle} 
          color="red" 
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <MetricChart title="CPU Utilization" type="cpu" data={cpuData} color="#10b981" />
        <MetricChart title="Memory Usage" type="memory" data={memData} color="#3b82f6" />
        <MetricChart title="Network Throughput" type="network" data={netData} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Recent Alerts */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Recent Alerts</h3>
              <p className="text-xs text-zinc-500 font-medium">Real-time anomaly detection</p>
            </div>
            <button
              onClick={() => setShowAllAlerts((prev) => !prev)}
              className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"
            >
              {showAllAlerts ? 'Show Recent' : 'View History'}
            </button>
          </div>
          <div className="space-y-2">
            {alerts.length > 0 ? (
              (showAllAlerts ? alerts : alerts.slice(0, 5)).map((alert, idx) => (
                <AlertItem 
                  key={idx}
                  severity={alert.severity} 
                  message={alert.message} 
                  time={new Date(alert.timestamp).toLocaleTimeString()} 
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-sm text-zinc-500 font-medium">No active alerts detected.</p>
              </div>
            )}
          </div>
        </div>

        {/* Cost Forecast */}
        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-10 shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-700" />
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-zinc-900 dark:text-white tracking-tight">Cost Intelligence</h3>
              <p className="text-xs text-zinc-500 font-medium">Projected resource expenditure</p>
            </div>
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          <div className="space-y-12 relative z-10">
            <div className="flex items-end justify-between">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">Estimated Monthly Spend</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">${Number(formattedSpend[0]).toLocaleString()}</span>
                  <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-600">.{formattedSpend[1]}</span>
                </div>
              </div>
              <div className="text-right space-y-2">
                <div className={cn(
                  "flex items-center gap-1.5 font-black text-xl",
                  spendTrendUp ? "text-emerald-500" : "text-red-500"
                )}>
                  {spendTrendUp ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                  {spendTrendLabel}
                </div>
                <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">vs last month</p>
              </div>
            </div>
            
            <div className="space-y-6">
              {roundedResourceSplit.map((item) => (
                <CostBar
                  key={item.label}
                  label={item.label}
                  percentage={item.percentage}
                  color={item.color}
                />
              ))}
            </div>

            <div className="pt-8 border-t border-zinc-200 dark:border-white/5 flex items-center justify-end">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Shared with 8 team members</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2rem] p-8 shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">Notifications</h3>
              <p className="text-xs text-zinc-500 font-medium">Access and workflow updates</p>
            </div>
          </div>
          <div className="space-y-2">
            {notifications.length === 0 ? (
              <p className="text-sm text-zinc-500">No notifications yet.</p>
            ) : notifications.map((n) => (
              <div key={n.id} className="rounded-xl border border-zinc-200 dark:border-white/10 p-4">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{n.title || 'Notification'}</p>
                <p className="text-xs text-zinc-500 mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, unit, data, trend, trendTone = 'neutral', icon: Icon, color }: any) => {
  const colorClasses = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
    purple: "text-purple-500 bg-purple-500/10 border-purple-500/20 shadow-purple-500/5",
    red: "text-red-500 bg-red-500/10 border-red-500/20 shadow-red-500/5"
  };

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all group shadow-sm dark:shadow-none backdrop-blur-xl relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700 pointer-events-none",
        color === 'emerald' ? 'bg-emerald-500' : color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : 'bg-red-500'
      )} />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className={cn("p-4 rounded-2xl border transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-lg", colorClasses[color as keyof typeof colorClasses])}>
          <Icon className="w-6 h-6" />
        </div>
        <div className={cn(
          "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl border transition-colors",
          trendTone === 'up'
            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            : trendTone === 'down'
              ? "bg-red-500/10 text-red-500 border-red-500/20"
              : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
        )}>
          {trendTone === 'up' ? <ArrowUpRight className="w-3 h-3" /> : trendTone === 'down' ? <ArrowDownRight className="w-3 h-3" /> : <span className="w-2 h-2 rounded-full bg-zinc-400" />}
          {trend}
        </div>
      </div>
      
      <div className="space-y-2 relative z-10">
        <h3 className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em]">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter leading-none">{value}</span>
          <span className="text-sm font-bold text-zinc-400 dark:text-zinc-600">{unit}</span>
        </div>
      </div>

      {/* Sparkline */}
      {data && data.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-20 opacity-20 group-hover:opacity-40 transition-all duration-700 translate-y-2 group-hover:translate-y-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0.5}/>
                  <stop offset="95%" stopColor={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#8b5cf6'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color === 'emerald' ? '#10b981' : color === 'blue' ? '#3b82f6' : '#8b5cf6'} 
                strokeWidth={3} 
                fillOpacity={1} 
                fill={`url(#gradient-${color})`} 
                isAnimationActive={true}
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
};

const AlertItem = ({ severity, message, time }: any) => (
  <motion.div 
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-5 p-5 rounded-[1.5rem] hover:bg-zinc-100 dark:hover:bg-white/5 transition-all cursor-pointer group border border-transparent hover:border-zinc-200 dark:hover:border-white/10 shadow-sm hover:shadow-md"
  >
    <div className="relative">
      <div className={cn(
        "w-3 h-3 rounded-full shrink-0 animate-pulse relative z-10",
        severity === 'critical' ? 'bg-red-500' : 
        severity === 'warning' ? 'bg-amber-500' : 
        'bg-blue-500'
      )} />
      <div className={cn(
        "absolute inset-0 rounded-full blur-md animate-ping opacity-40",
        severity === 'critical' ? 'bg-red-500' : 
        severity === 'warning' ? 'bg-amber-500' : 
        'bg-blue-500'
      )} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 truncate group-hover:text-zinc-950 dark:group-hover:text-white transition-colors tracking-tight">{message}</p>
      <div className="flex items-center gap-3 mt-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{time}</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        <span className={cn(
          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
          severity === 'critical' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 
          severity === 'warning' ? 'text-amber-500 border-amber-500/20 bg-amber-500/5' : 
          'text-blue-500 border-blue-500/20 bg-blue-500/5'
        )}>
          {severity}
        </span>
      </div>
    </div>
    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
      <ChevronRight className="w-5 h-5 text-emerald-500" />
    </div>
  </motion.div>
);

const CostBar = ({ label, percentage, color }: any) => (
  <div className="space-y-2">
    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-900 dark:text-white">{percentage}%</span>
    </div>
    <div className="h-2 w-full bg-zinc-100 dark:bg-white/5 rounded-full overflow-hidden">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className={cn("h-full rounded-full shadow-lg", color)} 
      />
    </div>
  </div>
);

import { CheckCircle2, ChevronRight } from 'lucide-react';


```

## `src/pages/HelpDocs.tsx`

```tsx
import React from 'react';
import { BookOpen, KeyRound, Terminal, Bell, Radio, Users } from 'lucide-react';

const docs = [
  {
    icon: Terminal,
    title: 'Agent Installation Guide',
    text: 'Provision a server, copy the one-time API key, install systeminformation and axios, then run the generated Node.js agent with outbound HTTPS access to /api/metrics and /api/logs.',
  },
  {
    icon: KeyRound,
    title: 'API Reference',
    text: 'Telemetry and log ingestion use Authorization: Bearer <api-key>. Metric payloads support cpu, memory, disk, network, uptime, processes, ports, services, and timestamp.',
  },
  {
    icon: Bell,
    title: 'Alert Workflow',
    text: 'Configure CPU and memory rules in Alerts. Critical telemetry creates alerts and opens incidents automatically so responders can acknowledge and resolve the event.',
  },
  {
    icon: Radio,
    title: 'Public Status Page',
    text: 'Select public-facing services from server settings, then use the Status Page view to expose only display names, high-level state, uptime summary, and public incident notes.',
  },
  {
    icon: Users,
    title: 'Team and Roles',
    text: 'Owners and admins manage projects, invites, roles, and API keys. Developers can operate incidents and alerts, view team details, and review profile and organization information. Auditors are read-only across monitoring, logs, costs, risk, reports, and status views.',
  },
];

export const HelpDocs = () => (
  <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
    <div>
      <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
        <BookOpen className="w-4 h-4" />
        Documentation
      </div>
      <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Help & Docs</h1>
      <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
        Quick reference for the operational workflows required by the Nexo Cloud SRS.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {docs.map((item) => (
        <article key={item.title} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <item.icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-white">{item.title}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed mt-2">{item.text}</p>
          </div>
        </article>
      ))}
    </div>
  </div>
);

```

## `src/pages/Incidents.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Flame, CheckCircle2, Clock, RadioTower, MessageSquarePlus } from 'lucide-react';
import { collection, db, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '../firebase';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Incident } from '../types';

const statuses: Incident['status'][] = ['investigating', 'identified', 'monitoring', 'resolved'];

export const Incidents = () => {
  const { currentProjectId, user } = useAppStore();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [severity, setSeverity] = useState<Incident['severity']>('warning');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const incidentQuery = query(collection(db, `projects/${currentProjectId}/incidents`), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(incidentQuery, (snapshot) => {
      setIncidents(snapshot.docs.map((incidentDoc) => ({ id: incidentDoc.id, ...incidentDoc.data() } as Incident)));
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load incidents', error);
      setIncidents([]);
      setErrorMessage('Could not load incidents. Check project access and Firestore rules.');
    });
    return () => unsubscribe();
  }, [currentProjectId]);

  const createIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentProjectId || !newTitle.trim()) return;
    const incidentRef = doc(collection(db, `projects/${currentProjectId}/incidents`));
    const now = new Date().toISOString();
    try {
      await setDoc(incidentRef, {
        id: incidentRef.id,
        projectId: currentProjectId,
        title: newTitle.trim(),
        summary: newSummary.trim() || 'Manual incident opened by operations.',
        severity,
        status: 'investigating',
        publicVisible: severity !== 'info',
        timeline: [{
          status: 'investigating',
          message: 'Incident opened.',
          userId: user?.uid || '',
          timestamp: now,
        }],
        createdAt: now,
        updatedAt: now,
      });
      setNewTitle('');
      setNewSummary('');
      setSeverity('warning');
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to create incident', error);
      setErrorMessage('Could not create incident. Check your project role and Firestore rules.');
    }
  };

  const updateStatus = async (incident: Incident, status: Incident['status']) => {
    if (!currentProjectId || !incident.id) return;
    const timeline = Array.isArray(incident.timeline) ? incident.timeline : [];
    try {
      await updateDoc(doc(db, `projects/${currentProjectId}/incidents`, incident.id), {
        status,
        updatedAt: serverTimestamp(),
        ...(status === 'resolved' ? { resolvedAt: serverTimestamp() } : {}),
        timeline: [
          ...timeline,
          {
            status,
            message: `Status changed to ${status}.`,
            userId: user?.uid || '',
            timestamp: new Date().toISOString(),
          },
        ],
      });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update incident', error);
      setErrorMessage('Could not update incident. Check your project role and Firestore rules.');
    }
  };

  const openIncidents = incidents.filter((incident) => incident.status !== 'resolved').length;

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
            <Flame className="w-4 h-4" />
            Incident Response
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Incidents</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
            Track operational events from investigation to resolution with a persistent timeline.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 p-5 min-w-48">
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Open Incidents</p>
          <p className="text-4xl font-black text-zinc-900 dark:text-white">{openIncidents}</p>
        </div>
      </div>

      <form onSubmit={createIncident} className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_auto_auto] gap-3 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4">
        <input
          value={newTitle}
          onChange={(event) => setNewTitle(event.target.value)}
          placeholder="Incident title"
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        />
        <input
          value={newSummary}
          onChange={(event) => setNewSummary(event.target.value)}
          placeholder="Summary"
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        />
        <select
          value={severity}
          onChange={(event) => setSeverity(event.target.value as Incident['severity'])}
          className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
        >
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <button className="bg-emerald-500 text-zinc-950 rounded-xl px-5 py-3 text-sm font-black flex items-center justify-center gap-2">
          <MessageSquarePlus className="w-4 h-4" />
          Open
        </button>
      </form>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {incidents.map((incident) => (
          <article key={incident.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-5 shadow-sm dark:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn('text-[10px] uppercase tracking-widest font-black px-2 py-1 rounded-md', incident.severity === 'critical' ? 'bg-red-500/10 text-red-500' : incident.severity === 'warning' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500')}>
                    {incident.severity}
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">{incident.status}</span>
                </div>
                <h2 className="text-xl font-black text-zinc-900 dark:text-white">{incident.title}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{incident.summary}</p>
              </div>
              {incident.status === 'resolved' ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <RadioTower className="w-6 h-6 text-amber-500" />}
            </div>

            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(incident, status)}
                  disabled={incident.status === status}
                  className={cn('px-3 py-2 rounded-lg text-xs font-bold capitalize border transition-colors', incident.status === status ? 'bg-emerald-500 text-zinc-950 border-emerald-500' : 'border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-900 dark:hover:text-white')}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="space-y-3 border-t border-zinc-200 dark:border-white/10 pt-4">
              {(incident.timeline || []).slice(-4).map((item, index) => (
                <div key={`${incident.id}-${index}`} className="flex gap-3 text-sm">
                  <Clock className="w-4 h-4 text-zinc-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-white capitalize">{item.status.replace('_', ' ')}</p>
                    <p className="text-zinc-500 dark:text-zinc-400">{item.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

```

## `src/pages/JoinOrganization.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { auth, collection, query, where, onSnapshot, db, orderBy, limit } from '../firebase';

export const JoinOrganization = () => {
  const [inviteCode, setInviteCode] = useState('');
  const [requestedRole, setRequestedRole] = useState<'viewer' | 'developer' | 'admin'>('viewer');
  const [githubUsername, setGithubUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, 'joinRequests'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, []);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'pending').length, [requests]);

  const submitRequest = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Invite code is required.');
      return;
    }
    if (requestedRole === 'developer' && !githubUsername.trim()) {
      setError('GitHub username is required for developer role.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const resp = await fetch('/api/org/join-request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inviteCode: code,
          requestedRole,
          githubUsername: requestedRole === 'developer' ? githubUsername.trim() : undefined,
        }),
      });
      const payload = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(payload?.error || 'Failed to create join request');
      setMessage('Join request submitted. Owner has been notified.');
      setInviteCode('');
      setGithubUsername('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Join Organization</h1>
        <p className="text-zinc-500 mt-1">Use a valid invite code and request your role.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Invite code"
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2"
          />
          <select
            value={requestedRole}
            onChange={(e) => setRequestedRole(e.target.value as 'viewer' | 'developer' | 'admin')}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2"
          >
            <option value="viewer">Auditor</option>
            <option value="developer">Developer</option>
            <option value="admin">Admin</option>
          </select>
          <input
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="GitHub username (developer only)"
            disabled={requestedRole !== 'developer'}
            className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-lg px-3 py-2 disabled:opacity-50"
          />
        </div>
        <button
          onClick={submitRequest}
          disabled={loading}
          className="bg-emerald-500 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Join Request'}
        </button>
        {message ? <p className="text-sm text-emerald-500">{message}</p> : null}
        {error ? <p className="text-sm text-red-500">{error}</p> : null}
      </div>

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Your Join Requests</h2>
          <span className="text-xs text-zinc-500">Pending: {pendingCount}</span>
        </div>
        <div className="space-y-2">
          {requests.length === 0 ? <p className="text-sm text-zinc-500">No requests submitted yet.</p> : requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-zinc-200 dark:border-white/10 px-3 py-2 text-sm flex items-center justify-between">
              <span>{r.orgName || r.orgId} • {r.requestedRole}</span>
              <span className="uppercase text-xs font-bold text-zinc-500">{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

```

## `src/pages/Logs.tsx`

```tsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Terminal, 
  Filter, 
  Download, 
  Play, 
  Pause,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { cn } from '../lib/utils';

import { collection, query, orderBy, limit, onSnapshot, db, handleFirestoreError, OperationType } from '../firebase';
import { useAppStore } from '../store';

export const Logs = () => {
  const { currentProjectId } = useAppStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentProjectId || isPaused) return;

    const logsQuery = query(
      collection(db, `projects/${currentProjectId}/logs`),
      orderBy('timestamp', 'desc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          timestamp: data.timestamp ? new Date(data.timestamp) : new Date()
        };
      });
      
      const sorted = logList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setLogs(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${currentProjectId}/logs`);
    });

    return () => unsubscribe();
  }, [currentProjectId, isPaused]);

  useEffect(() => {
    if (scrollRef.current && !isPaused) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'info' | 'warn' | 'error'>('all');

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         log.service.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const handleClearView = () => {
    setSearchQuery('');
    setLevelFilter('all');
    setLogs([]);
  };

  return (
    <div className="p-8 h-[calc(100vh-64px)] flex flex-col space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Log Explorer</h1>
          <p className="text-zinc-500 mt-1">Real-time system logs and event streaming</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search logs..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 pl-10 pr-4 py-2 rounded-lg text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors w-64 shadow-sm dark:shadow-none"
            />
          </div>
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border",
              isPaused 
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                : "bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/5 hover:text-zinc-900 dark:hover:text-white"
            )}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            onClick={handleClearView}
            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 rounded-lg text-zinc-500 hover:text-red-400 transition-colors shadow-sm dark:shadow-none"
            title="Clear current log view"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm dark:shadow-2xl">
        <div className="bg-zinc-50 dark:bg-zinc-900/50 px-6 py-3 border-b border-zinc-200 dark:border-white/5 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-zinc-400 uppercase tracking-widest">Streaming</span>
          </div>
          <div className="h-4 w-px bg-zinc-200 dark:bg-white/10" />
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Level:</span>
              <select 
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as any)}
                className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors border-none focus:ring-0 cursor-pointer"
              >
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-1 selection:bg-emerald-500/30"
        >
          {filteredLogs.length > 0 ? (
            filteredLogs.map((log, i) => (
              <div key={i} className="flex gap-4 py-0.5 group hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors rounded px-2">
                <span className="text-zinc-500 shrink-0">{log.timestamp.toLocaleTimeString()}</span>
                <span className={cn(
                  "uppercase font-bold w-12 shrink-0",
                  log.level === 'error' ? 'text-red-500' : 
                  log.level === 'warn' ? 'text-amber-500' : 'text-emerald-500'
                )}>
                  {log.level}
                </span>
                <span className="text-blue-500 dark:text-blue-400 shrink-0">[{log.service}]</span>
                <span className="text-zinc-700 dark:text-zinc-300">{log.message}</span>
              </div>
            ))
          ) : (
            <div className="h-full flex items-center justify-center text-zinc-500 italic">
              No logs found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FilterBadge = ({ label }: { label: string }) => (
  <button className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors">
    {label}
    <ChevronRight className="w-3 h-3 rotate-90" />
  </button>
);

```

## `src/pages/Reports.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { FileBarChart, Download } from 'lucide-react';
import { collection, db, onSnapshot, query, where } from '../firebase';
import { Alert, Incident, RiskInsight, Server } from '../types';
import { useAppStore } from '../store';
import { isActiveServer } from '../lib/utils';

export const Reports = () => {
  const { currentProjectId } = useAppStore();
  const [servers, setServers] = useState<Server[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [risks, setRisks] = useState<RiskInsight[]>([]);
  const [range, setRange] = useState('30');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const onError = (label: string) => (error: unknown) => {
      console.error(`Reports ${label} listener failed`, error);
      setErrorMessage('Some report data could not be loaded for this account.');
    };
    const unsubServers = onSnapshot(query(collection(db, 'servers'), where('projectId', '==', currentProjectId)), (snapshot) => {
      setServers(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Server)).filter(isActiveServer));
      setErrorMessage('');
    }, onError('servers'));
    const unsubAlerts = onSnapshot(collection(db, `projects/${currentProjectId}/alerts`), (snapshot) => setAlerts(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Alert))), onError('alerts'));
    const unsubIncidents = onSnapshot(collection(db, `projects/${currentProjectId}/incidents`), (snapshot) => setIncidents(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as Incident))), onError('incidents'));
    const unsubRisks = onSnapshot(collection(db, `projects/${currentProjectId}/risk_insights`), (snapshot) => setRisks(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as RiskInsight))), onError('risks'));
    return () => { unsubServers(); unsubAlerts(); unsubIncidents(); unsubRisks(); };
  }, [currentProjectId]);

  const report = useMemo(() => {
    const online = servers.filter((server) => server.status === 'online').length;
    const degraded = servers.filter((server) => server.status === 'degraded').length;
    const offline = servers.filter((server) => server.status === 'offline').length;
    const criticalAlerts = alerts.filter((alert) => alert.severity === 'critical').length;
    const openIncidents = incidents.filter((incident) => incident.status !== 'resolved').length;
    const openRisks = risks.filter((risk) => risk.status !== 'dismissed').length;
    const estimatedMonthlyCost = servers.length * 45;
    return { online, degraded, offline, criticalAlerts, openIncidents, openRisks, estimatedMonthlyCost };
  }, [servers, alerts, incidents, risks]);

  const exportCsv = () => {
    const csv = [
      ['Metric', 'Value'],
      ['Range Days', range],
      ['Servers', servers.length],
      ['Online', report.online],
      ['Degraded', report.degraded],
      ['Offline', report.offline],
      ['Critical Alerts', report.criticalAlerts],
      ['Open Incidents', report.openIncidents],
      ['Open Risks', report.openRisks],
      ['Estimated Monthly Cost', report.estimatedMonthlyCost],
    ].map((row) => row.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `nexo-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 space-y-8 max-w-[1200px] mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]"><FileBarChart className="w-4 h-4" />Reports</div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Operational Reports</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-2">Generate summaries for infrastructure health, alerts, incidents, risks, and estimated costs.</p>
        </div>
        <div className="flex gap-3">
          <select value={range} onChange={(event) => setRange(event.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button onClick={exportCsv} className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center gap-2"><Download className="w-4 h-4" />CSV</button>
        </div>
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ReportCard label="Servers" value={servers.length} />
        <ReportCard label="Critical Alerts" value={report.criticalAlerts} />
        <ReportCard label="Open Incidents" value={report.openIncidents} />
        <ReportCard label="Open Risks" value={report.openRisks} />
        <ReportCard label="Estimated Monthly Cost" value={`$${report.estimatedMonthlyCost.toLocaleString()}`} />
        <ReportCard label="Average Uptime" value={servers.length ? `${Math.round((report.online / servers.length) * 100)}%` : '0%'} />
      </div>
      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 space-y-3">
        <h2 className="font-black text-zinc-900 dark:text-white">Summary</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
          During the selected {range}-day range, Nexo Cloud observed {servers.length} servers, {alerts.length} alerts,
          {incidents.length} incidents, and {risks.length} risk insights. Cost figures are estimated because no cloud billing API is connected.
        </p>
      </div>
    </div>
  );
};

const ReportCard = ({ label, value }: { label: string; value: string | number }) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</p>
    <p className="text-4xl font-black text-zinc-900 dark:text-white mt-2">{value}</p>
  </div>
);

```

## `src/pages/RiskAnalysis.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ShieldAlert, TrendingUp, EyeOff, ClipboardCheck } from 'lucide-react';
import { collection, db, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, limit } from '../firebase';
import { RiskInsight, Server, ServerMetric } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { useAppStore } from '../store';

export const RiskAnalysis = () => {
  const { currentProjectId, userRole } = useAppStore();
  const canOperate = userRole !== 'viewer';
  const [servers, setServers] = useState<Server[]>([]);
  const [insights, setInsights] = useState<RiskInsight[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!currentProjectId) return;
    const serverQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serverQuery, (snapshot) => {
      setServers(snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as Server)).filter(isActiveServer));
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load risk servers', error);
      setServers([]);
      setErrorMessage('Could not load servers for risk analysis. Check project access and Firestore rules.');
    });
  }, [currentProjectId]);

  useEffect(() => {
    if (!currentProjectId) return;
    const insightQuery = query(collection(db, `projects/${currentProjectId}/risk_insights`), orderBy('createdAt', 'desc'), limit(100));
    return onSnapshot(insightQuery, (snapshot) => {
      setInsights(snapshot.docs.map((insightDoc) => ({ id: insightDoc.id, ...insightDoc.data() } as RiskInsight)));
    }, (error) => {
      console.error('Failed to load risk insights', error);
      setInsights([]);
      setErrorMessage('Could not load risk insights. Check project access and Firestore rules.');
    });
  }, [currentProjectId]);

  useEffect(() => {
    if (!canOperate || !currentProjectId || servers.length === 0) return;
    const unsubscribers = servers.map((server) => {
      const metricsQuery = query(collection(db, `servers/${server.id}/metrics`), orderBy('timestamp', 'desc'), limit(12));
      return onSnapshot(metricsQuery, async (snapshot) => {
        try {
          const metrics = snapshot.docs.map((metricDoc) => metricDoc.data() as ServerMetric);
          if (metrics.length < 2) return;
          const latest = metrics[0];
          const previous = metrics.slice(1);
          const previousMemory = previous.reduce((sum, metric) => sum + Number(metric.memory || 0), 0) / previous.length;
          const previousDisk = previous.reduce((sum, metric) => sum + Number(metric.disk || 0), 0) / previous.length;
          const candidates: Array<Omit<RiskInsight, 'id' | 'createdAt'>> = [];
          if (Number(latest.memory || 0) >= previousMemory + 10 && Number(latest.memory || 0) > 75) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'memory_trend', severity: Number(latest.memory) > 90 ? 'critical' : 'warning', message: `${server.name} memory is trending upward toward capacity.`, status: 'open', score: Number(latest.memory) });
          }
          if (Number(latest.disk || 0) >= previousDisk + 8 && Number(latest.disk || 0) > 80) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'disk_pressure', severity: Number(latest.disk) > 92 ? 'critical' : 'warning', message: `${server.name} disk usage is increasing and may require cleanup or expansion.`, status: 'open', score: Number(latest.disk) });
          }
          if (Array.isArray(latest.ports) && latest.ports.length > 20) {
            candidates.push({ serverId: server.id, projectId: currentProjectId, type: 'open_ports', severity: 'warning', message: `${server.name} reported an unusually large open-port surface.`, status: 'open', score: latest.ports.length });
          }
          await Promise.all(candidates.map((candidate) => {
            const stableId = `${candidate.serverId}_${candidate.type}`;
            return setDoc(doc(db, `projects/${currentProjectId}/risk_insights`, stableId), {
              id: stableId,
              ...candidate,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            }, { merge: true });
          }));
          setErrorMessage('');
        } catch (error) {
          console.error('Failed to update risk insights', error);
          setErrorMessage('Risk analysis could not update derived insights. Check write permissions.');
        }
      }, (error) => {
        console.error('Failed to load risk metrics', error);
        setErrorMessage('Could not load telemetry for risk analysis. Check project access and Firestore rules.');
      });
    });
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [currentProjectId, servers, canOperate]);

  const rankedInsights = useMemo(() => [...insights].sort((a, b) => {
    const rank = { critical: 3, warning: 2, info: 1 };
    return rank[b.severity] - rank[a.severity];
  }), [insights]);

  const updateInsight = async (insight: RiskInsight, status: RiskInsight['status']) => {
    if (!currentProjectId || !insight.id) return;
    try {
      await updateDoc(doc(db, `projects/${currentProjectId}/risk_insights`, insight.id), { status, updatedAt: serverTimestamp() });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update risk insight', error);
      setErrorMessage('Could not update risk insight. Check your project role and Firestore rules.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
          <ShieldAlert className="w-4 h-4" />
          Deep Infrastructure Risk
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Risk Analysis</h1>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-2">
          Derived insights are estimates based on telemetry trends and security-relevant signals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskStat label="Critical" value={rankedInsights.filter((item) => item.severity === 'critical' && item.status !== 'dismissed').length} tone="critical" />
        <RiskStat label="Under Review" value={rankedInsights.filter((item) => item.status === 'under_review').length} tone="review" />
        <RiskStat label="Servers Analyzed" value={servers.length} tone="normal" />
      </div>
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="space-y-4">
        {rankedInsights.length === 0 ? (
          <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-16 text-center text-zinc-500">No risk insights yet. Stream telemetry to build trend history.</div>
        ) : rankedInsights.map((insight) => (
          <div key={insight.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', insight.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500')}>
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-black text-zinc-500">{insight.type.replace('_', ' ')}</span>
                  <span className={cn('text-[10px] uppercase tracking-widest font-black', insight.status === 'dismissed' ? 'text-zinc-400' : 'text-emerald-500')}>{insight.status.replace('_', ' ')}</span>
                </div>
                <p className="text-zinc-900 dark:text-white font-bold mt-1">{insight.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={!canOperate} onClick={() => updateInsight(insight, 'under_review')} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" />
                Review
              </button>
              <button disabled={!canOperate} onClick={() => updateInsight(insight, 'dismissed')} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RiskStat = ({ label, value, tone }: { label: string; value: number; tone: 'critical' | 'review' | 'normal' }) => (
  <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-6">
    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</p>
    <p className={cn('text-4xl font-black mt-2', tone === 'critical' ? 'text-red-500' : tone === 'review' ? 'text-amber-500' : 'text-zinc-900 dark:text-white')}>{value}</p>
  </div>
);

```

## `src/pages/Servers.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  ResponsiveContainer, 
  YAxis, 
  XAxis 
} from 'recharts';
import { 
  Server as ServerIcon, 
  Plus, 
  Terminal, 
  Copy, 
  Check, 
  Activity, 
  Clock, 
  Shield, 
  RefreshCw,
  Trash2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { 
  db, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from '../firebase';
import { useAppStore } from '../store';
import { Server, ServerMetric, Project } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { writeAuditLog } from '../lib/audit';

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value: any, fallback = 'N/A') => toDate(value)?.toLocaleDateString() || fallback;
const formatTime = (value: any, fallback = '') => toDate(value)?.toLocaleTimeString() || fallback;
const isServerOnline = (server: Server, now: number) => {
  const lastSeen = toDate(server.lastSeen);
  return server.status === 'online' && Boolean(lastSeen && now - lastSeen.getTime() < 15000);
};

export const Servers = () => {
  const { currentOrgId, currentProjectId, setProject, user, userRole } = useAppStore();
  const canManage = userRole === 'owner' || userRole === 'admin';
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [serverHostname, setServerHostname] = useState('');
  const [serverOs, setServerOs] = useState('');
  const [serverEnvironment, setServerEnvironment] = useState<'prod' | 'staging' | 'dev'>('prod');
  const [tags, setTags] = useState<{ key: string, value: string }[]>([{ key: '', value: '' }]);
  const [generatedConfig, setGeneratedConfig] = useState<{ id: string, apiKey: string } | null>(null);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const selectedServerOnline = selectedServer ? isServerOnline(selectedServer, now) : false;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelectedServer((current) => current ? servers.find((server) => server.id === current.id) || current : null);
  }, [servers]);

  useEffect(() => {
    if (!currentOrgId) {
      setProjectIds([]);
      return;
    }

    const projectsRef = collection(db, `organizations/${currentOrgId}/projects`);
    const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
      const ids = snapshot.docs.map((projectDoc) => {
        const data = projectDoc.data() as Partial<Project>;
        return data.id || projectDoc.id;
      });
      setProjectIds(ids);

      if (ids.length > 0 && (!currentProjectId || !ids.includes(currentProjectId))) {
        setProject(ids[0]);
      }
    }, (error) => {
      setProjectIds([]);
      console.error(`Failed to load projects for org ${currentOrgId}:`, error);
    });

    return () => unsubscribe();
  }, [currentOrgId, currentProjectId, setProject]);

  useEffect(() => {
    if (!currentOrgId && !currentProjectId) {
      setServers([]);
      setLoading(false);
      return;
    }

    const scopedProjectIds = Array.from(
      new Set(
        projectIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );
    const fallbackProjectId = currentProjectId && currentProjectId.length > 0 ? currentProjectId : null;
    const effectiveProjectIds = scopedProjectIds.length > 0
      ? scopedProjectIds
      : (fallbackProjectId ? [fallbackProjectId] : []);

    if (effectiveProjectIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribers: Array<() => void> = [];
    const chunkServerMaps = new Map<string, Map<string, Server>>();
    const initializedChunks = new Set<string>();
    const totalChunks = Math.ceil(effectiveProjectIds.length / 10);

    for (let i = 0; i < effectiveProjectIds.length; i += 10) {
      const chunk = effectiveProjectIds.slice(i, i + 10);
      const chunkKey = chunk.join('|');
      const chunkQuery = query(collection(db, 'servers'), where('projectId', 'in', chunk));
      const unsubscribe = onSnapshot(chunkQuery, (snapshot) => {
        const currentChunkMap = new Map<string, Server>();
        snapshot.docs.forEach((serverDoc) => {
          const server = { id: serverDoc.id, ...serverDoc.data() } as Server;
          if (isActiveServer(server)) {
            currentChunkMap.set(serverDoc.id, server);
          }
        });
        chunkServerMaps.set(chunkKey, currentChunkMap);

        initializedChunks.add(chunkKey);
        const merged = new Map<string, Server>();
        chunkServerMaps.forEach((serverMap) => {
          serverMap.forEach((server, id) => merged.set(id, server));
        });
        setServers(Array.from(merged.values()));
        if (initializedChunks.size >= totalChunks) {
          setLoading(false);
        }
      }, (error) => {
        console.error('Servers stream failed for project chunk:', chunk, error);
        initializedChunks.add(chunkKey);
        if (initializedChunks.size >= totalChunks) {
          setLoading(false);
        }
      }
      );
      unsubscribers.push(unsubscribe);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentOrgId, currentProjectId, projectIds]);

  const handleAddServer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setProvisionError(null);
    const effectiveProjectId = currentProjectId && projectIds.includes(currentProjectId)
      ? currentProjectId
      : (projectIds[0] || null);
    if (!effectiveProjectId) {
      setProvisionError('No active project selected. Choose a project in the top bar and try again.');
      return;
    }
    if (!newServerName.trim()) {
      setProvisionError('Node identifier is required.');
      return;
    }

    const serverId = crypto.randomUUID();
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const apiKey = `nexo_live_${Array.from(keyBytes).map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    const apiKeyHash = await sha256Hex(apiKey);

    const tagsObject = tags.reduce((acc, tag) => {
      if (tag.key.trim() && tag.value.trim()) {
        acc[tag.key.trim()] = tag.value.trim();
      }
      return acc;
    }, {} as Record<string, string>);
    const serverRef = doc(db, 'servers', serverId);
    const newServer: Server = {
      id: serverId,
      projectId: effectiveProjectId,
      name: newServerName.trim(),
      apiKeyHash,
      apiKeyStatus: 'active',
      status: 'offline',
      createdAt: serverTimestamp(),
      environment: serverEnvironment,
      hostname: serverHostname.trim() || newServerName.trim(),
      os: serverOs.trim() || 'Unknown',
      tags: tagsObject
    };

    try {
      await setDoc(serverRef, newServer);
      await setDoc(doc(db, `servers/${serverId}/audit_logs`, crypto.randomUUID()), {
        event: 'api_key_created',
        serverId,
        projectId: effectiveProjectId,
        createdAt: serverTimestamp(),
      });
      await writeAuditLog({
        orgId: currentOrgId,
        projectId: effectiveProjectId,
        userId: user?.uid,
        action: 'server_registered',
        resource: 'server',
        resourceId: serverId,
        metadata: { name: newServerName.trim(), tags: tagsObject },
      });
      await writeAuditLog({
        orgId: currentOrgId,
        projectId: effectiveProjectId,
        userId: user?.uid,
        action: 'api_key_generated',
        resource: 'server',
        resourceId: serverId,
      });
      setGeneratedConfig({ id: serverId, apiKey });
      setNewServerName('');
      setServerHostname('');
      setServerOs('');
      setServerEnvironment('prod');
      setTags([{ key: '', value: '' }]);
    } catch (error) {
      setProvisionError('Failed to provision node. Verify project access and try again.');
      handleFirestoreError(error, OperationType.CREATE, `servers/${serverId}`);
    }
  };

  const addTag = () => setTags([...tags, { key: '', value: '' }]);
  const removeTag = (index: number) => setTags(tags.filter((_, i) => i !== index));
  const updateTag = (index: number, field: 'key' | 'value', value: string) => {
    const newTags = [...tags];
    newTags[index][field] = value;
    setTags(newTags);
  };

  const handleDeleteServer = async (serverId: string) => {
    if (!canManage) return;
    setDeleteError(null);
    setDeletingServerId(serverId);
    try {
      await setDoc(doc(db, 'servers', serverId), {
        status: 'offline',
        apiKeyStatus: 'revoked',
        apiKeyRevokedAt: serverTimestamp(),
        deletedAt: serverTimestamp(),
      }, { merge: true });
      await setDoc(doc(db, `servers/${serverId}/audit_logs`, crypto.randomUUID()), {
        event: 'api_key_revoked',
        serverId,
        createdAt: serverTimestamp(),
      });
      await writeAuditLog({
        orgId: currentOrgId,
        projectId: currentProjectId,
        userId: user?.uid,
        action: 'server_removed',
        resource: 'server',
        resourceId: serverId,
      });
      setServers((prev) => prev.filter((server) => server.id !== serverId));
      setSelectedServer(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Failed to terminate node', error);
      setDeleteError('Could not terminate this node. Check your project role and Firestore rules.');
      handleFirestoreError(error, OperationType.UPDATE, `servers/${serverId}`);
    } finally {
      setDeletingServerId(null);
    }
  };

  const handleUpdatePublicStatus = async (serverId: string, updates: Partial<Server>) => {
    if (!canManage) return;
    await setDoc(doc(db, 'servers', serverId), updates, { merge: true });
    setSelectedServer((prev) => prev && prev.id === serverId ? { ...prev, ...updates } : prev);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
            <ServerIcon className="w-4 h-4" />
            Infrastructure
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white">Connected Nodes</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium max-w-xl">
            Manage and monitor your hybrid cloud infrastructure from a single pane of glass.
          </p>
        </div>
        <button 
          disabled={!canManage}
          onClick={() => setShowAddModal(true)}
          className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 px-8 py-4 rounded-2xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5 flex items-center gap-3"
        >
          <Plus className="w-5 h-5" />
          Provision Node
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <RefreshCw className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">Synchronizing Infrastructure...</p>
        </div>
      ) : servers.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900/40 border border-dashed border-zinc-200 dark:border-white/10 rounded-[3rem] p-20 text-center shadow-sm dark:shadow-none backdrop-blur-sm">
          <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-950 rounded-[2rem] border border-zinc-200 dark:border-white/5 flex items-center justify-center mx-auto mb-8 shadow-inner">
            <ServerIcon className="w-10 h-10 text-zinc-400 dark:text-zinc-700" />
          </div>
          <h3 className="text-3xl font-black text-zinc-900 dark:text-white mb-4 tracking-tight">No nodes detected</h3>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mb-10 font-medium leading-relaxed">
            Your infrastructure is currently silent. Deploy the Nexo Agent to start streaming real-time telemetry from your servers.
          </p>
          <button 
            disabled={!canManage}
          onClick={() => setShowAddModal(true)}
            className="bg-emerald-500 text-zinc-950 px-10 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"
          >
            Connect your first server
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {servers.map((server) => (
            <ServerCard 
              key={server.id} 
              server={server} 
              now={now}
              canManage={canManage}
              onDelete={() => handleDeleteServer(server.id)} 
              onSelect={() => setSelectedServer(server)}
            />
          ))}
        </div>
      )}


      {/* Add Server Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowAddModal(false);
                setGeneratedConfig(null);
              }}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              {!generatedConfig ? (
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-500 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Plus className="text-zinc-950 w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Provision Node</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium">Register a new machine to start streaming telemetry</p>
                    </div>
                  </div>

                  <form onSubmit={handleAddServer} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Node Identifier</label>
                      <div className="relative group">
                        <ServerIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="e.g. production-api-01"
                          value={newServerName}
                          onChange={(e) => setNewServerName(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-2xl pl-14 pr-6 py-4 text-zinc-900 dark:text-white font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-zinc-300 dark:placeholder:text-zinc-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Hostname</label>
                        <input
                          type="text"
                          placeholder="api-01.internal"
                          value={serverHostname}
                          onChange={(e) => setServerHostname(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Operating System</label>
                        <input
                          type="text"
                          placeholder="Ubuntu 24.04"
                          value={serverOs}
                          onChange={(e) => setServerOs(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Environment</label>
                        <select
                          value={serverEnvironment}
                          onChange={(e) => setServerEnvironment(e.target.value as 'prod' | 'staging' | 'dev')}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                        >
                          <option value="prod">Production</option>
                          <option value="staging">Staging</option>
                          <option value="dev">Development</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                          <Activity className="h-5 w-5" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">Live telemetry only</p>
                          <p className="text-sm font-semibold leading-6 text-zinc-600 dark:text-zinc-300">
                            CPU, memory, network, disk, uptime, processes, ports, and services are collected by the Nexo Agent and streamed through the metrics API. This node will remain offline until its first real telemetry heartbeat is received.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Metadata Tags</label>
                        <button 
                          type="button"
                          onClick={addTag}
                          className="flex items-center gap-2 text-[10px] font-black text-emerald-500 hover:text-emerald-400 uppercase tracking-widest transition-colors bg-emerald-500/5 px-3 py-1.5 rounded-lg border border-emerald-500/10"
                        >
                          <Plus className="w-3 h-3" />
                          Add Tag
                        </button>
                      </div>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 no-scrollbar">
                        <AnimatePresence mode="popLayout">
                          {tags.map((tag, index) => (
                            <motion.div 
                              key={index}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              className="flex gap-3"
                            >
                              <input 
                                type="text" 
                                placeholder="Key"
                                value={tag.key}
                                onChange={(e) => updateTag(index, 'key', e.target.value)}
                                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                              />
                              <input 
                                type="text" 
                                placeholder="Value"
                                value={tag.value}
                                onChange={(e) => updateTag(index, 'value', e.target.value)}
                                className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                              />
                              {tags.length > 1 && (
                                <button 
                                  type="button"
                                  onClick={() => removeTag(index)}
                                  className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                    {provisionError && (
                      <div className="text-red-500 text-xs font-bold tracking-wide uppercase bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                        {provisionError}
                      </div>
                    )}
                    <button 
                      type="submit"
                      disabled={!newServerName}
                      className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 py-5 rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5 disabled:opacity-50 disabled:scale-100"
                    >
                      Generate Provisioning Key
                    </button>
                  </form>
                </div>
              ) : (
                <div className="space-y-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-500 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <Terminal className="text-zinc-950 w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Provisioning Ready</h2>
                      <p className="text-zinc-500 dark:text-zinc-400 font-medium">Follow these steps to connect your node</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-5 border border-zinc-200 dark:border-white/5 space-y-2 group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Node ID</span>
                          <button onClick={() => copyToClipboard(generatedConfig.id)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <code className="text-emerald-500 font-mono text-sm block truncate font-bold">{generatedConfig.id}</code>
                      </div>

                      <div className="bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-5 border border-zinc-200 dark:border-white/5 space-y-2 group">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">API Key</span>
                          <button onClick={() => copyToClipboard(generatedConfig.apiKey)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <code className="text-emerald-500 font-mono text-sm block truncate font-bold">{generatedConfig.apiKey}</code>
                      </div>
                    </div>

                    <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] space-y-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">1. Install Nexo Agent</p>
                          <span className="text-[10px] font-bold text-zinc-400">Node.js required</span>
                        </div>
                        <div className="bg-zinc-950 p-4 rounded-xl font-mono text-xs text-emerald-500 border border-white/5 flex items-center justify-between group">
                          <code className="font-bold">npm install systeminformation axios</code>
                          <button onClick={() => copyToClipboard('npm install systeminformation axios')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Copy className="w-4 h-4 text-zinc-500 hover:text-white" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">2. Deploy Agent Script</p>
                        <div className="bg-zinc-950 p-4 rounded-xl font-mono text-[10px] text-emerald-500 border border-white/5 relative group">
                          <pre className="overflow-x-auto max-h-40 no-scrollbar font-bold leading-relaxed">
{`const si = require('systeminformation');
const axios = require('axios');

const API_KEY = '${generatedConfig.apiKey}';
const SERVER_ID = '${generatedConfig.id}';
const API_URL = '${window.location.origin}/api/metrics';

async function collectAndSend() {
  try {
    const [cpu, mem, net, fs, processes, connections, services, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsSize(),
      si.processes(),
      si.networkConnections(),
      si.services('*'),
      si.time()
    ]);

    const metrics = {
      serverId: SERVER_ID,
      cpu: Math.round(cpu.currentLoad),
      memory: Math.round((mem.active / mem.total) * 100),
      network: Math.round((net[0].rx_sec + net[0].tx_sec) / 1024),
      disk: Math.round(fs[0].use),
      uptime: time.uptime,
      processes: processes.list.slice(0, 20).map((p) => ({ pid: p.pid, name: p.name, cpu: p.cpu, memory: p.mem })),
      ports: connections.slice(0, 50).map((conn) => conn.localPort).filter(Boolean),
      services: services.slice(0, 30).map((svc) => ({ name: svc.name, status: svc.running ? 'running' : 'stopped' })),
      timestamp: new Date().toISOString()
    };

    await axios.post(API_URL, metrics, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });

    console.log(\`[\${new Date().toLocaleTimeString()}] Metrics sent: CPU \${metrics.cpu}% | MEM \${metrics.memory}%\`);
  } catch (error) {
    console.error('Agent error:', error.message);
  }
}

setInterval(collectAndSend, 5000);
collectAndSend();`}
                          </pre>
                          <button 
                            onClick={() => {
                              const script = `const si = require('systeminformation');
const axios = require('axios');

const API_KEY = '${generatedConfig.apiKey}';
const SERVER_ID = '${generatedConfig.id}';
const API_URL = '${window.location.origin}/api/metrics';

async function collectAndSend() {
  try {
    const [cpu, mem, net, fs, processes, connections, services, time] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.networkStats(),
      si.fsSize(),
      si.processes(),
      si.networkConnections(),
      si.services('*'),
      si.time()
    ]);

    const metrics = {
      serverId: SERVER_ID,
      cpu: Math.round(cpu.currentLoad),
      memory: Math.round((mem.active / mem.total) * 100),
      network: Math.round((net[0].rx_sec + net[0].tx_sec) / 1024),
      disk: Math.round(fs[0].use),
      uptime: time.uptime,
      processes: processes.list.slice(0, 20).map((p) => ({ pid: p.pid, name: p.name, cpu: p.cpu, memory: p.mem })),
      ports: connections.slice(0, 50).map((conn) => conn.localPort).filter(Boolean),
      services: services.slice(0, 30).map((svc) => ({ name: svc.name, status: svc.running ? 'running' : 'stopped' })),
      timestamp: new Date().toISOString()
    };

    await axios.post(API_URL, metrics, {
      headers: {
        'Authorization': \`Bearer \${API_KEY}\`,
        'Content-Type': 'application/json'
      }
    });

    console.log(\`[\${new Date().toLocaleTimeString()}] Metrics sent: CPU \${metrics.cpu}% | MEM \${metrics.memory}%\`);
  } catch (error) {
    console.error('Agent error:', error.message);
  }
}

setInterval(collectAndSend, 5000);
collectAndSend();`;
                              copyToClipboard(script);
                            }} 
                            className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="w-4 h-4 text-zinc-500 hover:text-white" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        setShowAddModal(false);
                        setGeneratedConfig(null);
                      }}
                      className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 py-5 rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
                    >
                      Complete Provisioning
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Server Details Modal */}
      <AnimatePresence>
        {selectedServer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedServer(null)}
              className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[2.5rem] p-5 sm:p-10 shadow-2xl"
            >
              {/* Decorative elements */}
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-10 relative z-10">
                <div className="flex items-start justify-between gap-3 sm:items-center">
                  <div className="flex min-w-0 items-center gap-3 sm:gap-6">
                    <div className={cn(
                      "w-16 h-16 rounded-[1.25rem] flex items-center justify-center border shadow-lg transition-all duration-700",
                      selectedServerOnline
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-emerald-500/10" 
                        : "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500"
                    )}>
                      <ServerIcon className={cn("w-8 h-8", selectedServerOnline && "animate-pulse")} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight break-words">{selectedServer.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-zinc-500 dark:text-zinc-400 font-mono text-xs font-bold break-all">{selectedServer.id}</p>
                        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          selectedServerOnline ? "text-emerald-500" : "text-zinc-400"
                        )}>
                          {selectedServerOnline ? 'online' : 'offline'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    aria-label="Close server details"
                    onClick={() => setSelectedServer(null)}
                    className="shrink-0 p-3 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 rounded-xl transition-all"
                  >
                    <Plus className="w-6 h-6 rotate-45" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Provisioned On</p>
                          <Clock className="w-4 h-4 text-zinc-400" />
                        </div>
                        <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                          {formatDate(selectedServer.createdAt)}
                        </p>
                        <p className="text-xs font-bold text-zinc-500">
                          {formatTime(selectedServer.createdAt)}
                        </p>
                      </div>
                      <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-3xl p-6 border border-zinc-200 dark:border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Last Telemetry</p>
                          <Activity className="w-4 h-4 text-emerald-500" />
                        </div>
                        <p className="text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                          {formatTime(selectedServer.lastSeen, 'Never')}
                        </p>
                        <p className="text-xs font-bold text-zinc-500">
                          {selectedServerOnline ? 'Active Stream' : 'Connection Lost'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-[2.5rem] p-8 border border-zinc-200 dark:border-white/5 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Metadata Tags</h3>
                        <span className="text-[10px] font-bold text-zinc-400">{Object.keys(selectedServer.tags || {}).length} Tags</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {selectedServer.tags && Object.entries(selectedServer.tags).length > 0 ? (
                          Object.entries(selectedServer.tags).map(([key, value]) => (
                            <div key={key} className="px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl text-xs font-bold text-zinc-500 shadow-sm flex items-center gap-3 group/tag">
                              <span className="text-emerald-500 uppercase tracking-widest text-[9px] font-black">{key}</span>
                              <div className="w-px h-3 bg-zinc-200 dark:bg-white/10" />
                              <span className="text-zinc-900 dark:text-zinc-200">{value}</span>
                            </div>
                          ))
                        ) : (
                          <div className="w-full py-10 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-white/10 rounded-3xl">
                            <p className="text-xs text-zinc-400 italic font-medium">No metadata tags assigned to this node.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-[2.5rem] p-8 border border-zinc-200 dark:border-white/5 space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Provisioning Key</p>
                          <button
                            onClick={() => selectedServer.apiKey ? copyToClipboard(selectedServer.apiKey) : undefined}
                            disabled={!selectedServer.apiKey}
                            className="text-zinc-400 hover:text-emerald-500 transition-colors disabled:opacity-30"
                          >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                        <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-white/5 relative group">
                          <code className="text-xs text-emerald-500 font-mono block truncate font-bold">
                            {selectedServer.apiKey ? selectedServer.apiKey : 'Stored as SHA-256 hash. New keys are shown only once.'}
                          </code>
                          <div className="absolute inset-0 bg-zinc-900/80 dark:bg-zinc-950/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">Click to copy</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-8 border-t border-zinc-200 dark:border-white/5">
                        {!showDeleteConfirm ? (
                          <button 
                            disabled={!canManage}
                            onClick={() => {
                              setDeleteError(null);
                              setShowDeleteConfirm(true);
                            }}
                            className="w-full py-4 bg-red-500/5 border border-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
                          >
                            Terminate Node
                          </button>
                        ) : (
                          <div className="space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                              <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center leading-relaxed">
                                This revokes the ingestion key and marks the node offline. Historical alerts and incidents are retained.
                              </p>
                            </div>
                            {deleteError && (
                              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] font-black text-red-500 uppercase tracking-widest text-center">
                                {deleteError}
                              </div>
                            )}
                            <div className="flex gap-3">
                              <button 
                                onClick={() => void handleDeleteServer(selectedServer.id)}
                                disabled={deletingServerId === selectedServer.id}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                              >
                                {deletingServerId === selectedServer.id ? 'Terminating...' : 'Confirm'}
                              </button>
                              <button 
                                onClick={() => {
                                  setDeleteError(null);
                                  setShowDeleteConfirm(false);
                                }}
                                className="flex-1 py-3 bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-[2rem] p-6 border border-zinc-200 dark:border-white/5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Public Status Page</span>
                        <button
                          disabled={!canManage}
                          aria-label={`Toggle public status for ${selectedServer.name}`}
                          onClick={() => handleUpdatePublicStatus(selectedServer.id, { publicStatusEnabled: !selectedServer.publicStatusEnabled })}
                          className={cn(
                            "w-11 h-6 rounded-full relative transition-colors",
                            selectedServer.publicStatusEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                          )}
                        >
                          <span className={cn("absolute top-1 w-4 h-4 bg-white rounded-full transition-all", selectedServer.publicStatusEnabled ? "left-6" : "left-1")} />
                        </button>
                      </div>
                      <input
                        disabled={!canManage}
                        value={selectedServer.publicName || selectedServer.name}
                        onChange={(event) => handleUpdatePublicStatus(selectedServer.id, { publicName: event.target.value })}
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white"
                      />
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        The public page uses this display name and high-level status only.
                      </p>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-6 space-y-4">
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">Security Audit</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                        This node is currently protected by Nexo's Zero-Trust mesh. All traffic is encrypted end-to-end.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const Gauge = ({ value, label, color, icon: Icon }: { value: number, label: string, color: string, icon: any }) => {
  const radius = 32;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3 group/gauge">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90 drop-shadow-[0_0_8px_rgba(0,0,0,0.05)]"
        >
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset: 0 }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-zinc-100 dark:text-zinc-800"
          />
          <motion.circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Icon className="w-3 h-3 text-zinc-400 mb-0.5" />
          <span className="text-xs font-black text-zinc-900 dark:text-white tracking-tighter">
            {Math.round(value)}%
          </span>
        </div>
        
        {/* Glow effect */}
        <div 
          className="absolute inset-0 rounded-full opacity-0 group-hover/gauge:opacity-20 transition-opacity blur-xl"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
};

const ServerCard = ({
  server,
  now,
  onDelete,
  canManage,
  onSelect
}: {
  server: Server;
  now: number;
  onDelete: () => void;
  canManage: boolean;
  onSelect: () => void;
}) => {
  const [metrics, setMetrics] = useState<ServerMetric[]>([]);

  useEffect(() => {
    const metricsQuery = query(
      collection(db, `servers/${server.id}/metrics`)
    );

    const unsubscribe = onSnapshot(
      metricsQuery,
      snapshot => {
        const sorted = snapshot.docs
          .map(d => d.data() as ServerMetric)
          .sort(
            (a, b) =>
              new Date(a.timestamp).getTime() -
              new Date(b.timestamp).getTime()
          );

        setMetrics(sorted.slice(-20));
      },
      error => {
        console.error(
          `Metrics stream failed for server ${server.id}:`,
          error
        );

        setMetrics([]);
      }
    );

    return () => unsubscribe();
  }, [server.id]);

  const latestMetric = metrics[metrics.length - 1];

  const lastSeenAt = toDate(server.lastSeen);
  const isOnline = isServerOnline(server, now);

  const cpu = Number(latestMetric?.cpu || 0);
  const memory = Number(latestMetric?.memory || 0);
  const network = Number(latestMetric?.network || 0);

  const formattedNetwork = network.toFixed(2);

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 20
      }}
      animate={{
        opacity: 1,
        y: 0
      }}
      whileHover={{
        y: -4
      }}
      onClick={onSelect}
      className="bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-white/5 rounded-[2.5rem] p-8 hover:border-emerald-500/30 transition-all group shadow-sm dark:shadow-none cursor-pointer flex flex-col h-full relative overflow-hidden backdrop-blur-sm"
    >
      <div
        className={cn(
          'absolute -right-20 -top-20 w-64 h-64 rounded-full blur-[100px] opacity-0 group-hover:opacity-10 transition-opacity duration-700 pointer-events-none',
          isOnline ? 'bg-emerald-500' : 'bg-zinc-500'
        )}
      />

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all duration-700',
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.15)]'
                : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-white/5 text-zinc-400 dark:text-zinc-500'
            )}
          >
            <ServerIcon
              className={cn(
                'w-8 h-8',
                isOnline && 'animate-pulse'
              )}
            />
          </div>

          <div className="space-y-1">
            <h3 className="font-black text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors text-xl tracking-tight leading-none">
              {server.name}
            </h3>

            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  isOnline
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                    : 'bg-zinc-400 dark:bg-zinc-600'
                )}
              />

              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                {isOnline ? 'Active' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        <button
          disabled={!canManage}
          onClick={e => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-3 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {server.tags &&
        Object.entries(server.tags).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10 relative z-10">
            {Object.entries(server.tags).map(
              ([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10 rounded-xl shadow-sm"
                >
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                    {key}
                  </span>

                  <div className="w-px h-3 bg-zinc-200 dark:bg-white/10" />

                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {String(value)}
                  </span>
                </div>
              )
            )}
          </div>
        )}

      <div className="space-y-10 flex-1 relative z-10">
        <div className="flex items-center justify-center gap-10 py-2">
          <Gauge
            value={isOnline ? cpu : 0}
            label="CPU Load"
            color="#10b981"
            icon={Activity}
          />

          <div className="w-px h-12 bg-zinc-200 dark:bg-white/10" />

          <Gauge
            value={isOnline ? memory : 0}
            label="Memory"
            color="#3b82f6"
            icon={Shield}
          />
        </div>

        <div className="flex items-center justify-between p-5 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-100 dark:border-white/5 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />

            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              Network Throughput
            </span>
          </div>

          <span className="text-sm font-black text-zinc-900 dark:text-white tracking-tight">
            {isOnline
              ? `${formattedNetwork} MB/s`
              : '--'}
          </span>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 text-zinc-400">
          <Clock className="w-3.5 h-3.5" />

          <span className="text-[10px] font-bold uppercase tracking-widest">
            {lastSeenAt
              ? `Seen ${lastSeenAt.toLocaleTimeString()}`
              : 'Never seen'}
          </span>
        </div>

        <div className="flex items-center gap-2 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
          Inspect

          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};

const MetricMiniCard = ({ label, value }: { label: string, value: string }) => (
  <div className="bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-lg p-2 text-center">
    <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-tighter mb-1">{label}</p>
    <p className="text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">{value}</p>
  </div>
);

```

## `src/pages/Settings.tsx`

```tsx
import { createProject } from '../lib/projects';
import React, { useState, useEffect } from 'react';
import { 
  User, 
  Building, 
  Shield, 
  Bell, 
  CreditCard, 
  Save, 
  Loader2, 
  Users, 
  UserMinus, 
  UserPlus,
  Mail, 
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Folder,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  sendPasswordResetEmail,
  auth,
  updateProfile,
  signOut
} from '../firebase';
import { useAppStore } from '../store';
import { cn } from '../lib/utils';
import { Organization, UserProfile, Invite, Project, OrgMember } from '../types';
import { ROLE_OPTIONS, roleBadgeLabel, roleLabel } from '../lib/roles';

export const Settings = () => {
  const { user, currentOrgId, currentProjectId, setUser, setOrg: setCurrentOrg, setProject } = useAppStore();
  const [activeSection, setActiveSection] = useState<'profile' | 'organization' | 'projects' | 'security' | 'notifications'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<(UserProfile & { role: string })[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [inviteCodeLoading, setInviteCodeLoading] = useState(false);

  // Notification settings
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifFrequency, setNotifFrequency] = useState(50); // Slider value

  // Security settings
  const [twoFactor, setTwoFactor] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Billing settings
  const [billingEmail, setBillingEmail] = useState(user?.email || '');

  // Project creation state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEnv, setNewProjectEnv] = useState<'prod' | 'staging' | 'dev'>('dev');
  const [inviteRows, setInviteRows] = useState<Array<{ email: string; role: 'admin' | 'developer' | 'viewer' }>>([
    { email: '', role: 'viewer' },
  ]);
  const [manualInviteLinks, setManualInviteLinks] = useState<Array<{ email: string; link: string }>>([]);
  const currentUserRole = members.find(m => m.uid === user?.uid)?.role || (org?.ownerId === user?.uid ? 'owner' : 'viewer');
  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin' || org?.ownerId === user?.uid;

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setBillingEmail(user?.email || '');
  }, [user?.displayName, user?.email]);

  useEffect(() => {
    if (!user?.uid) return;
    const key = `nexo_settings_${user.uid}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed.notifEmail === 'boolean') setNotifEmail(parsed.notifEmail);
      if (typeof parsed.notifPush === 'boolean') setNotifPush(parsed.notifPush);
      if (typeof parsed.notifFrequency === 'number') setNotifFrequency(parsed.notifFrequency);
      if (typeof parsed.twoFactor === 'boolean') setTwoFactor(parsed.twoFactor);
      if (typeof parsed.billingEmail === 'string') setBillingEmail(parsed.billingEmail);
    } catch {
      // Ignore malformed local settings.
    }
  }, [user?.uid]);

  useEffect(() => {
    if (!canManage && activeSection === 'projects') setActiveSection('organization');
  }, [activeSection, canManage]);

  useEffect(() => {
    if (!user?.uid) return;
    const loadRemoteSettings = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        const data = userSnap.data() as any;
        const prefs = data?.notificationPreferences || {};
        if (typeof prefs.email === 'boolean') setNotifEmail(prefs.email);
        if (typeof prefs.push === 'boolean') setNotifPush(prefs.push);
        if (typeof prefs.sensitivity === 'number') setNotifFrequency(prefs.sensitivity);
        if (typeof data?.twoFactorEnabled === 'boolean') setTwoFactor(data.twoFactorEnabled);
      } catch (error) {
        console.error('Failed to load remote settings', error);
      }
    };
    loadRemoteSettings();
  }, [user?.uid]);

  // Fetch Organization Data
  useEffect(() => {
    if (!currentOrgId) return;

    const orgRef = doc(db, 'organizations', currentOrgId);
    const unsubscribeOrg = onSnapshot(orgRef, (doc) => {
      if (doc.exists()) {
        setOrg(doc.data() as Organization);
      }
    });

    // Fetch Members from subcollection
    const membersSubQuery = collection(db, `organizations/${currentOrgId}/members`);
    const unsubscribeMembers = onSnapshot(membersSubQuery, async (snapshot) => {
      const memberDocs = snapshot.docs.map(d => d.data() as OrgMember);
      
      setMembers(memberDocs.map((m) => ({ ...m, createdAt: m.joinedAt })));

    });

    // Fetch Projects
    const projectsQuery = collection(db, `organizations/${currentOrgId}/projects`);
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      setProjects(projectsList);
    });

    return () => {
      unsubscribeOrg();
      unsubscribeMembers();
      unsubscribeProjects();
    };
  }, [currentOrgId]);

  useEffect(() => {
    if (!currentOrgId || !canManage) {
      setInvites([]);
      return;
    }

    const invitesQuery = query(collection(db, `organizations/${currentOrgId}/invites`), where('status', '==', 'pending'));
    return onSnapshot(invitesQuery, (snapshot) => {
      const invitesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invite));
      setInvites(invitesList);
    }, (error) => {
      console.error('Failed to load pending invites', error);
      setInvites([]);
    });
  }, [currentOrgId, canManage]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setErrorMessage('');
    setSuccessMessage('');
    const normalizedDisplayName = displayName.trim();
    if (!normalizedDisplayName) {
      setErrorMessage('Display name is required.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      const payload = {
        displayName: normalizedDisplayName,
        photoURL: user.photoURL || '',
        ...(currentOrgId ? { currentOrgId } : {}),
      };
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, payload);
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || '',
          role: 'viewer',
          createdAt: serverTimestamp(),
          ...payload,
        }, { merge: true });
      }
      if (currentOrgId) {
        await updateDoc(doc(db, `organizations/${currentOrgId}/members`, user.uid), { displayName: normalizedDisplayName, photoURL: user.photoURL || '' });
      }
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: normalizedDisplayName });
        setUser(auth.currentUser);
      }
      setDisplayName(normalizedDisplayName);

      setSaved(true);
      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to save profile", error);
      setErrorMessage('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrg = async (updates: Partial<Organization>) => {
    if (!currentOrgId || !canManage) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const orgRef = doc(db, 'organizations', currentOrgId);
      await setDoc(orgRef, updates, { merge: true });
      setSaved(true);
      setSuccessMessage('Organization updated.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to update organization", error);
      setErrorMessage('Failed to update organization.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMemberRole = async (memberUid: string, newRole: string) => {
    if (!currentOrgId || !canManage) return;
    try {
      const memberRef = doc(db, `organizations/${currentOrgId}/members`, memberUid);
      await updateDoc(memberRef, { role: newRole });
    } catch (error) {
      console.error("Failed to update member role", error);
    }
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!currentOrgId || memberUid === user?.uid || !canManage) return;
    if (!window.confirm("Are you sure you want to remove this member?")) return;

    try {
      const memberRef = doc(db, `organizations/${currentOrgId}/members`, memberUid);
      await deleteDoc(memberRef);
    } catch (error) {
      console.error("Failed to remove member", error);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    if (!currentOrgId || !canManage) return;
    try {
      const inviteRef = doc(db, `organizations/${currentOrgId}/invites`, inviteId);
      await deleteDoc(inviteRef);
    } catch (error) {
      console.error("Failed to cancel invite", error);
    }
  };

  const updateInviteRow = (index: number, updates: Partial<{ email: string; role: 'admin' | 'developer' | 'viewer' }>) => {
    setInviteRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...updates } : row)));
  };

  const addInviteRow = () => {
    setInviteRows((prev) => [...prev, { email: '', role: 'viewer' }]);
  };

  const removeInviteRow = (index: number) => {
    setInviteRows((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSendInvites = async () => {
    if (!currentOrgId || !user?.uid || !canManage) return;
    setManualInviteLinks([]);

    const trimmedRows = inviteRows
      .map((row) => ({ ...row, email: row.email.trim().toLowerCase() }))
      .filter((row) => row.email.length > 0);

    if (trimmedRows.length === 0) {
      alert('Add at least one email to send invites.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = trimmedRows.find((row) => !emailRegex.test(row.email));
    if (invalid) {
      alert(`Invalid email: ${invalid.email}`);
      return;
    }

    const pendingEmails = new Set(invites.map((i) => i.email.toLowerCase()));
    const uniqueRows = trimmedRows.filter((row, idx, arr) => arr.findIndex((r) => r.email === row.email) === idx);
    const rowsToInvite = uniqueRows.filter((row) => !pendingEmails.has(row.email));

    if (rowsToInvite.length === 0) {
      alert('All entered emails already have pending invites.');
      return;
    }

    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in again.');
      const results = await Promise.all(
        rowsToInvite.map(async (row) => {
          const response = await fetch('/api/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              orgId: currentOrgId,
              email: row.email,
              role: row.role,
              invitedBy: user.uid,
            }),
          });
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.error || `Failed to invite ${row.email}`);
          }
          return response.json();
        })
      );

      const links = results.flatMap((result: any, index) => typeof result?.inviteLink === 'string'
        ? [{ email: rowsToInvite[index].email, link: result.inviteLink as string }] : []);
      setManualInviteLinks(links);
      setErrorMessage([...new Set(results.map((result: any) => result.emailError).filter(Boolean))].join(' '));
      setInviteRows([{ email: '', role: 'viewer' }]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to send invites', error);
      const message = error instanceof Error ? error.message : 'Failed to send invites';
      setErrorMessage(message);
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrgId || !newProjectName || !canManage) return;
    setLoading(true);
    try {
      await createProject(currentOrgId, newProjectName.trim(), newProjectEnv);
      setNewProjectName('');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error("Failed to add project", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!currentOrgId || !canManage) return;
    if (!window.confirm("Are you sure you want to delete this project? All associated metrics and logs will be lost.")) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const response = await fetch('/api/delete-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: currentOrgId, projectId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Project deletion failed');
      if (currentProjectId === projectId) setProject(projects.find((project) => project.id !== projectId)?.id || null);
      setSuccessMessage('Project and its monitoring data deleted.');
    } catch (error) {
      console.error("Failed to delete project", error);
      setErrorMessage(error instanceof Error ? error.message : 'Project deletion failed');
    }
  };

  const handleSaveAll = async () => {
    if (!user?.uid) return;
    setErrorMessage('');
    setLoading(true);
    try {
      const key = `nexo_settings_${user.uid}`;
      localStorage.setItem(key, JSON.stringify({
        notifEmail,
        notifPush,
        notifFrequency,
        twoFactor,
        billingEmail: billingEmail.trim(),
        updatedAt: Date.now(),
      }));
      await setDoc(doc(db, 'users', user.uid), {
        notificationPreferences: {
          email: notifEmail,
          push: notifPush,
          sensitivity: notifFrequency,
        },
        twoFactorEnabled: twoFactor,
        billingEmail: billingEmail.trim(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSaved(true);
      setSuccessMessage('Settings saved successfully.');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings', error);
      setErrorMessage('Failed to save settings in this browser.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      setErrorMessage('No email found for this account.');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setPasswordResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setSuccessMessage('Password reset email sent. Please check your inbox.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Failed to send password reset email', error);
      const message = error instanceof Error ? error.message : 'Failed to send password reset email.';
      setErrorMessage(message);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!auth.currentUser || !user?.uid) {
      setErrorMessage('You need to be signed in to delete your account.');
      return;
    }

    const typed = window.prompt('Type DELETE to permanently delete your account.');
    if (typed !== 'DELETE') {
      setErrorMessage('Account deletion canceled. Type DELETE exactly to confirm.');
      return;
    }

    if (!window.confirm('This permanently deletes your account and removes your org memberships. Continue?')) {
      return;
    }

    setDeleteAccountLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = await auth.currentUser.getIdToken(true);
      const response = await fetch('/api/delete-account', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to delete account');
      }

      localStorage.removeItem(`nexo_settings_${user.uid}`);
      setProject(null);
      setCurrentOrg(null);
      setUser(null);
      await signOut(auth).catch(() => undefined);
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to delete account', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to delete account.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  const handleRegenerateInviteCode = async () => {
    if (!currentOrgId || !auth.currentUser) return;
    setInviteCodeLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = await auth.currentUser.getIdToken();
      const response = await fetch('/api/org/invite-code/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId: currentOrgId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to regenerate invite code');
      }
      setOrg((prev) => prev ? ({ ...prev, inviteCode: payload.inviteCode } as any) : prev);
      setSuccessMessage(`Invite code regenerated: ${payload.inviteCode}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to regenerate invite code');
    } finally {
      setInviteCodeLoading(false);
    }
  };

  const handleToggleTwoFactor = () => {
    setTwoFactor((prev) => !prev);
    setSuccessMessage('2FA preference updated. Enforcement requires secure-login OTP flow to be enabled.');
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Settings</h1>
          <p className="text-zinc-500 mt-1">Manage your account and organization preferences</p>
        </div>
        {(activeSection === 'security' || activeSection === 'notifications') && (
          <button 
            onClick={handleSaveAll}
            disabled={loading}
            className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : 'Save Changes'}
          </button>
        )}
      </div>
      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-3 text-sm">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="space-y-1 bg-white dark:bg-zinc-900/30 p-2 rounded-2xl border border-zinc-200 dark:border-white/5 h-fit sticky top-24 shadow-sm dark:shadow-none">
          <div className="px-3 py-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Menu</span>
          </div>
          <SettingsNav 
            icon={User} 
            label="Profile" 
            active={activeSection === 'profile'} 
            onClick={() => setActiveSection('profile')} 
          />
          <SettingsNav 
            icon={Building} 
            label="Organization" 
            active={activeSection === 'organization'} 
            onClick={() => setActiveSection('organization')} 
          />
          {canManage && (
            <SettingsNav
              icon={Folder}
              label="Projects"
              active={activeSection === 'projects'}
              onClick={() => setActiveSection('projects')}
            />
          )}
          <SettingsNav 
            icon={Shield} 
            label="Security" 
            active={activeSection === 'security'} 
            onClick={() => setActiveSection('security')} 
          />
          <SettingsNav 
            icon={Bell} 
            label="Notifications" 
            active={activeSection === 'notifications'} 
            onClick={() => setActiveSection('notifications')} 
          />
        </div>

        <div className="md:col-span-3 space-y-8">
          {activeSection === 'profile' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-emerald-500" />
                  Profile Information
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-center justify-end gap-4">
                {saved && <span className="text-emerald-500 text-sm font-medium animate-in fade-in">Settings saved!</span>}
                <button 
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="bg-zinc-900 dark:bg-emerald-500 text-white dark:text-zinc-950 px-8 py-3 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-emerald-400 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save Profile
                </button>
              </div>
            </div>
          )}

          {activeSection === 'organization' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Organization Details */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-500" />
                  Organization Details
                </h2>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Organization Name</label>
                    <div className="flex gap-4">
                      <input
                        type="text"
                        defaultValue={org?.name || ''}
                        onBlur={(e) => handleUpdateOrg({ name: e.target.value })}
                        disabled={!canManage}
                        className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors disabled:text-zinc-500 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Organization Owner</label>
                      <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-500 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        {members.find(m => m.uid === org?.ownerId)?.email || 'Loading...'}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Invite Code</label>
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 font-mono tracking-wider">
                          {(org as any)?.inviteCode || 'No invite code'}
                        </div>
                        {canManage ? (
                          <button
                            type="button"
                            onClick={handleRegenerateInviteCode}
                            disabled={inviteCodeLoading}
                            className="bg-zinc-900 dark:bg-emerald-500 text-white dark:text-zinc-950 px-4 py-3 rounded-xl text-sm font-bold hover:bg-zinc-800 dark:hover:bg-emerald-400 transition-all disabled:opacity-50"
                          >
                            {inviteCodeLoading ? 'Generating...' : 'Generate New Code'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Team Management */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-500" />
                    Team Members
                  </h2>
                  <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest">{members.length} Members</span>
                </div>

                <div className="space-y-2">
                  {members.map((member) => (
                    <div key={member.uid} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl group hover:border-zinc-300 dark:hover:border-white/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-white/5 flex items-center justify-center overflow-hidden">
                          <User className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900 dark:text-white">{member.displayName || 'Anonymous'}</p>
                          <p className="text-xs text-zinc-500">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {canManage && member.role !== 'owner' ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateMemberRole(member.uid, e.target.value)}
                            className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border-none focus:ring-0 cursor-pointer"
                          >
                            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        ) : (
                          <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded",
                            member.role === 'owner' ? "bg-emerald-500/10 text-emerald-500" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-400"
                          )}>
                            {roleBadgeLabel(member.role)}
                          </span>
                        )}
                        {canManage && member.uid !== user?.uid && member.role !== 'owner' && (
                          <button 
                            onClick={() => handleRemoveMember(member.uid)}
                            className="p-2 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Invite Members */}
              {canManage && (
                <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                      Invite Members
                    </h2>
                    <button
                      type="button"
                      onClick={addInviteRow}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add Row
                    </button>
                  </div>

                  <div className="space-y-3">
                    {inviteRows.map((row, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <input
                          type="email"
                          placeholder="member@company.com"
                          value={row.email}
                          onChange={(e) => updateInviteRow(index, { email: e.target.value })}
                          className="md:col-span-7 w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                        />
                        <select
                          value={row.role}
                          onChange={(e) => updateInviteRow(index, { role: e.target.value as 'admin' | 'developer' | 'viewer' })}
                          className="md:col-span-3 w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                        >
                          {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeInviteRow(index)}
                          className="md:col-span-2 w-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    {saved && <span className="text-emerald-500 text-sm font-medium animate-in fade-in">{manualInviteLinks.length ? 'Invites created. Share the links below.' : 'Invites sent!'}</span>}
                    <button
                      type="button"
                      onClick={handleSendInvites}
                      disabled={loading}
                      className="flex items-center gap-2 bg-emerald-500 text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-emerald-400 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                      Send Invites
                    </button>
                  </div>
                  {manualInviteLinks.length > 0 && <div className="space-y-3">
                    <p className="text-sm text-zinc-500">Email was not delivered. Share each link with its invitee.</p>
                    {manualInviteLinks.map(({ email, link }) => <label key={email} className="block text-xs font-bold text-zinc-500">
                      {email}
                      <input aria-label={`Invitation link for ${email}`} readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="mt-1 w-full rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm font-normal text-zinc-900 dark:text-white" />
                    </label>)}
                  </div>}
                </section>
              )}

              {/* Pending Invites */}
              {invites.length > 0 && (
                <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <Mail className="w-5 h-5 text-amber-500" />
                    Pending Invitations
                  </h2>

                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-white/5 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-zinc-900 dark:text-white">{invite.email}</p>
                            <p className="text-xs text-zinc-500">Invited as {roleLabel(invite.role)}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleCancelInvite(invite.id!)}
                          className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {activeSection === 'projects' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Add Project */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  New Project
                </h2>
                
                <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <input
                      type="text"
                      placeholder="Project Name"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <select
                      value={newProjectEnv}
                      onChange={(e) => setNewProjectEnv(e.target.value as any)}
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors appearance-none"
                    >
                      <option value="prod">Production</option>
                      <option value="staging">Staging</option>
                      <option value="dev">Development</option>
                    </select>
                  </div>
                  <button 
                    type="submit"
                    disabled={loading || !newProjectName}
                    className="bg-zinc-900 dark:bg-emerald-500 text-white dark:text-zinc-950 px-6 py-3 rounded-xl font-bold hover:bg-zinc-800 dark:hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Create Project
                  </button>
                </form>
              </section>

              {/* Projects List */}
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Folder className="w-5 h-5 text-emerald-500" />
                  Existing Projects
                </h2>

                <div className="grid grid-cols-1 gap-4">
                  {projects.length === 0 ? (
                    <div className="py-12 text-center border border-dashed border-zinc-200 dark:border-white/5 rounded-2xl">
                      <p className="text-zinc-500 text-sm">No projects found in this organization.</p>
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-6 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-2xl group hover:border-zinc-300 dark:hover:border-white/10 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center border border-zinc-200 dark:border-white/5">
                            <Folder className="w-6 h-6 text-zinc-400 dark:text-zinc-500" />
                          </div>
                          <div>
                            <p className="text-lg font-bold text-zinc-900 dark:text-white">{project.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                                project.environment === 'prod' ? "bg-emerald-500/10 text-emerald-500" :
                                project.environment === 'staging' ? "bg-amber-500/10 text-amber-500" :
                                "bg-blue-500/10 text-blue-500"
                              )}>
                                {project.environment}
                              </span>
                              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">ID: {project.id}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button 
                            aria-label={`Delete project ${project.name}`}
                            onClick={() => handleDeleteProject(project.id)}
                            className="p-3 text-zinc-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Shield className="w-5 h-5 text-emerald-500" />
                  Security Controls
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-950/50 border border-zinc-200 dark:border-white/5 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Two-Factor Authentication</p>
                      <p className="text-xs text-zinc-500">Persisted account setting. Secondary challenge method: email OTP in secure-login flow.</p>
                    </div>
                    <button 
                      onClick={handleToggleTwoFactor}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        twoFactor ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        twoFactor ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Change Password</label>
                    <div className="grid grid-cols-1 gap-4">
                      <input
                        type="password"
                        placeholder="Current Password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      <input
                        type="password"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={passwordResetLoading}
                        className="bg-zinc-100 dark:bg-white/5 text-zinc-900 dark:text-white border border-zinc-200 dark:border-white/10 px-6 py-2 rounded-lg text-sm font-semibold hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors w-fit disabled:opacity-50"
                      >
                        {passwordResetLoading ? 'Sending...' : 'Send Password Reset Email'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-zinc-900/50 border border-red-200 dark:border-red-500/30 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  Danger Zone
                </h2>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">Delete Account</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300">
                      This permanently deletes your user account, removes your memberships, and signs you out everywhere.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={deleteAccountLoading}
                    className="inline-flex items-center justify-center gap-2 bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {deleteAccountLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Delete Account
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <section className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-2xl p-8 space-y-6 shadow-sm dark:shadow-none">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-500" />
                  Notification Preferences
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Email Notifications</p>
                      <p className="text-xs text-zinc-500">Receive alerts and reports via email</p>
                    </div>
                    <button 
                      onClick={() => setNotifEmail(!notifEmail)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        notifEmail ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        notifEmail ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-white">Push Notifications</p>
                      <p className="text-xs text-zinc-500">Receive real-time alerts on your device</p>
                    </div>
                    <button 
                      onClick={() => setNotifPush(!notifPush)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        notifPush ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        notifPush ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Alert Sensitivity</label>
                      <span className="text-xs font-mono text-emerald-500">{notifFrequency}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={notifFrequency}
                      onChange={(e) => setNotifFrequency(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
                      <span>Low</span>
                      <span>Balanced</span>
                      <span>High</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SettingsNav = ({ icon: Icon, label, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
      active ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5"
    )}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

```

## `src/pages/StatusPage.tsx`

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Radio, CheckCircle2, AlertTriangle, XCircle, Terminal } from 'lucide-react';
import { Incident, Server } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { useAppStore } from '../store';

interface PublicLogEntry {
  id: string;
  source: string;
  level: 'info' | 'warn' | 'error';
  summary: string;
  timestamp: string | null;
}

export const StatusPage = () => {
  const { currentProjectId } = useAppStore();
  const publicProjectId = new URLSearchParams(window.location.search).get('projectId');
  const pathProjectId = window.location.pathname.startsWith('/status/')
    ? decodeURIComponent(window.location.pathname.replace('/status/', '').split('/')[0] || '')
    : '';
  const projectId = publicProjectId || pathProjectId || currentProjectId;
  const [servers, setServers] = useState<Server[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<PublicLogEntry[]>([]);
  const [serviceErrorMessage, setServiceErrorMessage] = useState('');
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      try {
        const endpoint = projectId
          ? `/api/public-status?projectId=${encodeURIComponent(projectId)}`
          : '/api/public-status';
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error('Could not load public status.');
        const data = await response.json();
        if (controller.signal.aborted) return;
        setServers(data.servers.map((server: Server) => ({ ...server, publicStatusEnabled: true })));
        setIncidents(data.incidents.map((incident: Incident) => ({ ...incident, publicVisible: true })));
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setServiceErrorMessage('');
      } catch (error) {
        if (!controller.signal.aborted) setServiceErrorMessage('Could not refresh public status.');
      } finally {
        if (!controller.signal.aborted) {
          setStatusLoading(false);
          timer = setTimeout(refresh, 3000);
        }
      }
    };
    setStatusLoading(true);
    setServers([]);
    setIncidents([]);
    setLogs([]);
    void refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [projectId]);

  const publicServices = servers.filter((server) => server.publicStatusEnabled);
  const activePublicIncidents = incidents.filter((incident) => incident.publicVisible && incident.status !== 'resolved');
  const overall = useMemo(() => {
    if (statusLoading) return 'Loading Public Status';
    if (serviceErrorMessage) return 'Status Unavailable';
    if (publicServices.length === 0) return 'No Public Services Configured';
    if (activePublicIncidents.some((incident) => incident.severity === 'critical') || publicServices.some((server) => server.status === 'offline')) return 'Major Outage';
    if (activePublicIncidents.length || publicServices.some((server) => server.status === 'degraded')) return 'Degraded Performance';
    return 'All Systems Operational';
  }, [activePublicIncidents, publicServices, serviceErrorMessage, statusLoading]);

  const overallTone = overall === 'Major Outage' ? 'text-red-500' : overall === 'Degraded Performance' ? 'text-amber-500' : overall === 'All Systems Operational' ? 'text-emerald-500' : 'text-zinc-500';

  return (
    <div className="min-h-full bg-white dark:bg-zinc-950 p-8 animate-in fade-in duration-500">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 dark:bg-white flex items-center justify-center">
              <Radio className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-zinc-900 dark:text-white">Nexo Cloud Status</h1>
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Public service view</p>
            </div>
          </div>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Login-free ready</span>
        </div>

        <section className="border border-zinc-200 dark:border-white/10 rounded-2xl p-8 bg-zinc-50 dark:bg-zinc-900/50">
          <p className={cn('text-4xl font-black tracking-tight', overallTone)}>{overall}</p>
          <p className="text-zinc-500 dark:text-zinc-400 mt-3">Only admin-selected public names and high-level status are shown here. Internal metrics and host details stay private.</p>
        </section>

        {serviceErrorMessage && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{serviceErrorMessage}</div>
        )}

        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Services</h2>
          {publicServices.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No public services configured yet.</div>
          ) : publicServices.map((server) => (
            <div key={server.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 flex items-center justify-between">
              <span className="font-bold text-zinc-900 dark:text-white">{server.publicName || server.name}</span>
              <ServiceStatus status={server.status} />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-zinc-900 dark:text-white">Recent Log Activity</h2>
              <p className="text-xs text-zinc-500 mt-1">Sanitized study excerpts from public services. Sensitive identifiers and values are removed.</p>
            </div>
            <Terminal className="w-5 h-5 text-zinc-400" />
          </div>
          {logs.length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-10 text-center text-zinc-500">No recent public log activity.</div>
          ) : logs.map((log) => (
            <div key={log.id} className="grid gap-2 md:grid-cols-[8rem_5rem_1fr_auto] items-center bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4 font-mono text-xs">
              <span className="font-bold text-zinc-900 dark:text-white">{log.source}</span>
              <span className={cn('uppercase font-black', log.level === 'error' ? 'text-red-500' : log.level === 'warn' ? 'text-amber-500' : 'text-emerald-500')}>{log.level}</span>
              <span className="text-zinc-600 dark:text-zinc-300 break-words">{log.summary}</span>
              <time className="text-zinc-400 whitespace-nowrap">{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'Time unavailable'}</time>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-black text-zinc-900 dark:text-white">Incident History</h2>
          {incidents.filter((incident) => incident.publicVisible).length === 0 ? (
            <div className="border border-dashed border-zinc-200 dark:border-white/10 rounded-2xl p-12 text-center text-zinc-500">No public incidents reported.</div>
          ) : incidents.filter((incident) => incident.publicVisible).map((incident) => (
            <div key={incident.id} className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-zinc-900 dark:text-white">{incident.title}</p>
                <span className="text-xs uppercase tracking-widest text-zinc-500 font-bold">{incident.status}</span>
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{incident.summary}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

const ServiceStatus = ({ status }: { status: Server['status'] }) => {
  if (status === 'online') {
    return <span className="text-emerald-500 text-sm font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />Operational</span>;
  }
  if (status === 'degraded') {
    return <span className="text-amber-500 text-sm font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Degraded</span>;
  }
  return <span className="text-red-500 text-sm font-bold flex items-center gap-2"><XCircle className="w-4 h-4" />Major Outage</span>;
};

```

## `src/pages/Team.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { Users, Mail, Shield, UserMinus, Server } from 'lucide-react';
import { auth, collection, db, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from '../firebase';
import { useAppStore } from '../store';
import { OrgMember, Server as ServerType, UserProfile } from '../types';
import { cn, isActiveServer } from '../lib/utils';
import { writeAuditLog } from '../lib/audit';
import { hasRole } from '../lib/rbac';
import { ROLE_OPTIONS, roleLabel } from '../lib/roles';

type MemberRow = UserProfile & { role: string; serverScope?: string[]; lastActivity?: any };

export const Team = () => {
  const { currentOrgId, currentProjectId, user, userRole } = useAppStore();
  const canManageTeam = hasRole(userRole, 'admin');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [servers, setServers] = useState<ServerType[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'developer' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  useEffect(() => {
    if (!currentOrgId) return;
    const unsubscribe = onSnapshot(collection(db, `organizations/${currentOrgId}/members`), async (snapshot) => {
      const rows = await Promise.all(snapshot.docs.map(async (memberDoc) => {
        const member = memberDoc.data() as OrgMember & { serverScope?: string[]; lastActivity?: any };
        return {
          uid: member.uid,
          email: member.email || '',
          displayName: member.displayName || '',
          photoURL: member.photoURL || '',
          role: member.role,
          serverScope: member.serverScope || [],
          lastActivity: member.lastActivity,
          createdAt: member.joinedAt,
        } as MemberRow;
      }));
      setMembers(rows);
      setErrorMessage('');
    }, (error) => {
      console.error('Failed to load team members', error);
      setMembers([]);
      setErrorMessage('Could not load team members. Check your organization role and Firestore rules.');
    });
    return () => unsubscribe();
  }, [currentOrgId]);

  useEffect(() => {
    if (!currentProjectId) {
      setServers([]);
      return;
    }
    const serversQuery = query(collection(db, 'servers'), where('projectId', '==', currentProjectId));
    return onSnapshot(serversQuery, (snapshot) => {
      setServers(snapshot.docs.map((serverDoc) => ({ id: serverDoc.id, ...serverDoc.data() } as ServerType)).filter(isActiveServer));
    }, (error) => {
      console.error('Failed to load team server scope', error);
      setServers([]);
      setErrorMessage('Could not load server scope. Check your role and Firestore rules.');
    });
  }, [currentProjectId]);

  const sendInvite = async () => {
    if (!currentOrgId || !user?.uid || !email.trim() || !canManageTeam) return;
    setInviteLink('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Please sign in again.');
      const response = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId: currentOrgId, email: email.trim().toLowerCase(), role, invitedBy: user.uid }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload?.error || 'Invite failed. Check Resend/Firebase Admin env.');
        return;
      }
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'user_invited', resource: 'invite', metadata: { email, role } });
      if (typeof payload.inviteLink === 'string') {
        setInviteLink(payload.inviteLink);
        setMessage('Invitation created. Email was not delivered; share this link with the invitee.');
      } else {
        setMessage('Invitation email sent.');
      }
      setErrorMessage(payload.emailError || '');
      setEmail('');
    } catch (error) {
      console.error('Invite failed', error);
      setErrorMessage('Could not send invite. Check the API server and email configuration.');
    }
  };

  const changeRole = async (member: MemberRow, nextRole: string) => {
    if (!currentOrgId || !user?.uid || !canManageTeam) return;
    try {
      await updateDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid), { role: nextRole, lastActivity: serverTimestamp() });
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'role_changed', resource: 'member', resourceId: member.uid, metadata: { role: nextRole } });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to change role', error);
      setErrorMessage('Could not change role. You may need owner/admin permissions.');
    }
  };

  const toggleServerScope = async (member: MemberRow, serverId: string) => {
    if (!currentOrgId || !user?.uid || !canManageTeam) return;
    const current = new Set(member.serverScope || []);
    if (current.has(serverId)) current.delete(serverId);
    else current.add(serverId);
    const serverScope = Array.from(current);
    try {
      await updateDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid), { serverScope, lastActivity: serverTimestamp() });
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'server_scope_changed', resource: 'member', resourceId: member.uid, metadata: { serverScope } });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to update server scope', error);
      setErrorMessage('Could not update server scope. You may need owner/admin permissions.');
    }
  };

  const removeMember = async (member: MemberRow) => {
    if (!currentOrgId || !user?.uid || member.uid === user.uid || !canManageTeam) return;
    if (!window.confirm(`Remove ${member.email || member.uid} from this workspace?`)) return;
    try {
      await deleteDoc(doc(db, `organizations/${currentOrgId}/members`, member.uid));
      await writeAuditLog({ orgId: currentOrgId, userId: user.uid, action: 'user_removed', resource: 'member', resourceId: member.uid });
      setErrorMessage('');
    } catch (error) {
      console.error('Failed to remove member', error);
      setErrorMessage('Could not remove member. You may need owner/admin permissions.');
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      <div>
        <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs uppercase tracking-[0.2em]">
          <Users className="w-4 h-4" />
          Team Management
        </div>
        <h1 className="text-5xl font-black tracking-tighter text-zinc-900 dark:text-white mt-2">Team</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
          {canManageTeam ? 'Invite members, change roles, and assign server scope.' : 'View members and assigned roles for your organization.'}
        </p>
      </div>

      {canManageTeam && (
        <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white" />
          <select value={role} onChange={(event) => setRole(event.target.value as any)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-white">
            {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button onClick={sendInvite} className="bg-emerald-500 text-zinc-950 px-5 py-3 rounded-xl font-black flex items-center justify-center gap-2"><Mail className="w-4 h-4" />Invite</button>
        </div>
      )}
      {message && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 px-4 py-3 text-sm">{message}</div>}
      {inviteLink && <input aria-label="Invitation link" readOnly value={inviteLink} onFocus={(event) => event.currentTarget.select()} className="w-full rounded-xl border border-emerald-500/30 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-900 dark:text-white" />}
      {errorMessage && <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 px-4 py-3 text-sm">{errorMessage}</div>}

      <div className="bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {members.map((member) => (
          <div key={member.uid} className="p-5 border-b border-zinc-200 dark:border-white/10 last:border-b-0 grid grid-cols-1 xl:grid-cols-[1.2fr_auto_1.4fr_auto] gap-4 items-center">
            <div>
              <p className="font-black text-zinc-900 dark:text-white">{member.displayName || member.email || member.uid}</p>
              <p className="text-sm text-zinc-500">{member.email || member.uid}</p>
            </div>
            {canManageTeam ? (
              <select disabled={member.role === 'owner'} value={member.role} onChange={(event) => changeRole(member, event.target.value)} className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-900 dark:text-white">
                {member.role === 'owner' && <option value="owner">Owner</option>}
                {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            ) : (
              <span className="bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-bold text-zinc-600 dark:text-zinc-300">
                {roleLabel(member.role)}
              </span>
            )}
            <div className="flex flex-wrap gap-2">
              {servers.length === 0 ? <span className="text-xs text-zinc-500">No servers in active project.</span> : servers.map((server) => (
                <button key={server.id} disabled={!canManageTeam} onClick={() => toggleServerScope(member, server.id)} className={cn('px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1', member.serverScope?.includes(server.id) ? 'bg-emerald-500 text-zinc-950 border-emerald-500' : 'border-zinc-200 dark:border-white/10 text-zinc-500', !canManageTeam && 'cursor-default opacity-80')}>
                  <Server className="w-3 h-3" />{server.name}
                </button>
              ))}
            </div>
            {canManageTeam && <button disabled={member.role === 'owner'} aria-label={`Remove ${member.email}`} onClick={() => removeMember(member)} className="text-red-500 hover:bg-red-500/10 rounded-xl p-3 justify-self-start xl:justify-self-end"><UserMinus className="w-5 h-5" /></button>}
          </div>
        ))}
      </div>
    </div>
  );
};

```

## `src/store.ts`

```tsx
import type { AppRole } from './lib/rbac';
import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  userRole: AppRole;
  user: User | null;
  currentOrgId: string | null;
  currentProjectId: string | null;
  theme: 'light' | 'dark';
  isSidebarCollapsed: boolean;
  setUser: (user: User | null) => void;
  setOrg: (orgId: string | null) => void;
  setProject: (projectId: string | null) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const getInitialTheme = (): 'light' | 'dark' => {
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
};

export const useAppStore = create<AppState>((set) => ({
  userRole: 'viewer',
  user: null,
  currentOrgId: null,
  currentProjectId: null,
  theme: getInitialTheme(),
  isSidebarCollapsed: false,
  setUser: (user) => set({ user }),
  setOrg: (currentOrgId) => set({ currentOrgId }),
  setProject: (currentProjectId) => set({ currentProjectId }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  setSidebarCollapsed: (isSidebarCollapsed) => set({ isSidebarCollapsed }),
}));

```

## `src/types.ts`

```tsx
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  currentOrgId?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  createdAt: any;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: any;
}

export interface Project {
  id: string;
  orgId: string;
  name: string;
  environment: 'prod' | 'staging' | 'dev';
  createdAt: any;
}

export interface Metric {
  id?: string;
  projectId: string;
  resourceId: string;
  type: 'cpu' | 'memory' | 'network' | 'disk';
  value: number;
  timestamp: any;
  isAnomaly?: boolean;
  anomalyScore?: number;
}

export interface Alert {
  id?: string;
  projectId: string;
  serverId?: string;
  alertType?: 'cpu' | 'memory' | 'disk' | 'network' | 'availability' | 'security';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  timestamp: any;
  acknowledgedBy?: string;
  acknowledgedAt?: any;
  resolvedBy?: string;
  resolvedAt?: any;
}

export interface LogEntry {
  id?: string;
  projectId: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  service: string;
  timestamp: any;
}

export interface OrgMember {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'owner' | 'admin' | 'developer' | 'viewer';
  joinedAt: any;
}
export interface Invite {
  id?: string;
  orgId: string;
  email: string;
  role: 'admin' | 'developer' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  createdAt: any;
}

export interface Server {
  id: string;
  projectId: string;
  name: string;
  apiKey?: string;
  apiKeyHash?: string;
  apiKeyStatus?: 'active' | 'revoked';
  lastSeen?: any;
  status: 'online' | 'degraded' | 'offline';
  createdAt: any;
  tags?: Record<string, string>;
  environment?: 'prod' | 'staging' | 'dev';
  hostname?: string;
  os?: string;
  description?: string;
  publicStatusEnabled?: boolean;
  publicName?: string;
}

export interface ServerMetric {
  id: string;
  serverId: string;
  projectId: string;
  cpu: number;
  memory: number;
  network: number;
  disk?: number;
  uptime?: number;
  processes?: Array<{ pid?: number; name: string; cpu?: number; memory?: number }>;
  ports?: Array<number | string>;
  services?: Array<{ name: string; status: string }>;
  timestamp: any;
}

export interface Incident {
  id?: string;
  projectId: string;
  serverId?: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'info' | 'warning' | 'critical';
  summary: string;
  publicVisible?: boolean;
  timeline: Array<{
    status: string;
    message: string;
    userId?: string;
    timestamp: any;
  }>;
  createdAt: any;
  updatedAt?: any;
  resolvedAt?: any;
}

export interface RiskInsight {
  id?: string;
  serverId: string;
  projectId?: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  status: 'open' | 'under_review' | 'dismissed';
  score?: number;
  createdAt: any;
  updatedAt?: any;
}

```

## `src/vite-env.d.ts`

```tsx
/// <reference types="vite/client" />

```
