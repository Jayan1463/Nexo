import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
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
  const [loading, setLoading] = useState(true);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const inviteHandledRef = useRef(false);

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

      if (firebaseUser) {
        setOrg(null);
        setProject(null);
        setUser(firebaseUser);
        setWorkspaceLoading(true);
        setLoading(false);

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
          if (!orgData.inviteCode) {
            await setDoc(doc(db, 'organizations', orgId), { inviteCode: makeInviteCode() }, { merge: true });
          }

          const memberRef = doc(db, `organizations/${orgId}/members`, firebaseUser.uid);
          const memberSnap = await getDoc(memberRef);
          const roleForMembership = orgData.ownerId === firebaseUser.uid ? 'owner' : 'viewer';
          if (!memberSnap.exists()) {
            await setDoc(memberRef, {
              ...profile,
              role: roleForMembership,
              joinedAt: serverTimestamp(),
            }, { merge: true });
          }

          const mergedOrgIds = Array.from(new Set([orgId, ...userOrgIds]));
          await setDoc(userRef, {
            ...profile,
            role: userData?.role || roleForMembership,
            currentOrgId: orgId,
            orgIds: mergedOrgIds,
            createdAt: userData?.createdAt || serverTimestamp(),
            updatedAt: serverTimestamp(),
          }, { merge: true });

          const projectsQuery = query(collection(db, `organizations/${orgId}/projects`), limit(1));
          const projectsSnap = await getDocs(projectsQuery);
          let projectId = projectsSnap.empty ? '' : projectsSnap.docs[0].id;
          if (!projectId) {
            const projectRef = doc(collection(db, `organizations/${orgId}/projects`));
            projectId = projectRef.id;
            await setDoc(projectRef, {
              id: projectId,
              orgId,
              name: 'Default Project',
              environment: 'prod',
              createdAt: serverTimestamp(),
            });
          }

          setProject(projectId);
          setUserRole(roleForMembership);

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          if (unsubscribeUserDoc) unsubscribeUserDoc();
          unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
            if (!snap.exists()) return;
            const data = snap.data() as any;
            const nextOrgId = typeof data?.currentOrgId === 'string' ? data.currentOrgId : useAppStore.getState().currentOrgId;
            let role = (data?.role || roleForMembership) as AppRole;
            if (nextOrgId) {
              try {
                const nextMemberSnap = await getDoc(doc(db, `organizations/${nextOrgId}/members`, firebaseUser.uid));
                const memberRole = nextMemberSnap.exists() ? nextMemberSnap.data()?.role : null;
                if (memberRole === 'owner' || memberRole === 'admin' || memberRole === 'developer' || memberRole === 'viewer') {
                  role = memberRole;
                }
              } catch (error) {
                console.error('Failed to load membership role', error);
              }
            }
            setUserRole(role);
            const activeOrgId = useAppStore.getState().currentOrgId;
            if (nextOrgId && nextOrgId !== activeOrgId) {
              setOrg(nextOrgId);
              setProject(null);
              const nextProjects = await getDocs(query(collection(db, `organizations/${nextOrgId}/projects`), limit(1)));
              if (!nextProjects.empty && useAppStore.getState().currentOrgId === nextOrgId) {
                setProject(nextProjects.docs[0].id);
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
      setLoading(false);
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
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
      if (!user || workspaceLoading || !currentOrgId || !currentProjectId || inviteHandledRef.current) return;
      if (window.location.pathname !== '/accept-invite') return;

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
        alert('Invite accepted. Welcome to the organization.');
      } catch (error) {
        console.error('Failed to accept invite', error);
        alert('Failed to accept invite. Please try again.');
      } finally {
        window.history.replaceState({}, '', '/');
      }
    };

    acceptInvite();
  }, [user, workspaceLoading, currentOrgId, currentProjectId, setOrg, setProject]);

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
