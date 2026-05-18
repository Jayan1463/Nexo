import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithPopup, 
  signInWithRedirect,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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
import { Dashboard } from './pages/Dashboard';
import { Topology3D } from './components/Topology3D';
import { Servers } from './pages/Servers';
import { Analytics } from './pages/Analytics';
import { Logs } from './pages/Logs';
import { Alerts } from './pages/Alerts';
import { Cost } from './pages/Cost';
import { Settings } from './pages/Settings';
import { 
  Zap, 
  ArrowRight,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppRole, canAccessTab } from './lib/rbac';
import { FirebaseError } from 'firebase/app';

const makeInviteCode = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export default function App() {
  const { user, setUser, currentOrgId, setOrg, setProject, theme, isSidebarCollapsed } = useAppStore();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userRole, setUserRole] = useState<AppRole>('viewer');
  const [loading, setLoading] = useState(true);
  const [needsOrgSetup, setNeedsOrgSetup] = useState(false);
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
    const generateUniqueInviteCode = async () => {
      for (let i = 0; i < 10; i += 1) {
        const candidate = makeInviteCode();
        const q = query(collection(db, 'organizations'), where('inviteCode', '==', candidate), limit(1));
        const snap = await getDocs(q);
        if (snap.empty) return candidate;
      }
      return `${makeInviteCode()}${Math.floor(Math.random() * 100)}`;
    };
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
      if (firebaseUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);
        let orgId = '';
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'viewer',
            orgIds: [],
            createdAt: serverTimestamp(),
          }, { merge: true });
          setNeedsOrgSetup(true);
        } else {
          const userData = userSnap.data() as any;
          const userOrgIds = Array.isArray(userData?.orgIds)
            ? userData.orgIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
            : [];
          orgId = (typeof userData?.currentOrgId === 'string' && userData.currentOrgId.length > 0)
            ? userData.currentOrgId
            : (userOrgIds[0] || '');

          if (orgId) {
            const existingOrgSnap = await getDoc(doc(db, 'organizations', orgId));
            if (!existingOrgSnap.exists()) {
              orgId = '';
            }
          }
          
          // If user doesn't have an orgId for some reason, find one or create one
          if (!orgId) {
            try {
              const orgsQuery = query(collection(db, 'organizations'), where('ownerId', '==', firebaseUser.uid));
              const orgsSnap = await getDocs(orgsQuery);
              if (!orgsSnap.empty) {
                orgId = orgsSnap.docs[0].id;
                await setDoc(userRef, { currentOrgId: orgId, orgIds: [orgId] }, { merge: true });
              } else {
                const orgRef = doc(collection(db, 'organizations'));
                orgId = orgRef.id;
                const inviteCode = await generateUniqueInviteCode();
                await setDoc(orgRef, {
                  id: orgId,
                  name: `${firebaseUser.displayName || 'My'}'s Organization`,
                  ownerId: firebaseUser.uid,
                  inviteCode,
                  plan: 'free',
                  createdAt: serverTimestamp(),
                });
                // Create member document
                const memberRef = doc(db, `organizations/${orgId}/members`, firebaseUser.uid);
                await setDoc(memberRef, {
                  uid: firebaseUser.uid,
                  role: 'owner',
                  joinedAt: serverTimestamp(),
                });
                await setDoc(userRef, { currentOrgId: orgId, orgIds: [orgId] }, { merge: true });
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'organizations/users');
            }
          }

          if (orgId) {
            try {
              const orgSnap = await getDoc(doc(db, 'organizations', orgId));
              const orgData = orgSnap.exists() ? orgSnap.data() as any : null;
              const roleForMembership = orgData?.ownerId === firebaseUser.uid ? 'owner' : 'viewer';
              const memberRef = doc(db, `organizations/${orgId}/members`, firebaseUser.uid);
              const memberSnap = await getDoc(memberRef);
              if (!memberSnap.exists()) {
                await setDoc(memberRef, {
                  uid: firebaseUser.uid,
                  role: roleForMembership,
                  joinedAt: serverTimestamp(),
                }, { merge: true });
              }

              const mergedOrgIds = Array.from(
                new Set([
                  orgId,
                  ...userOrgIds,
                ].filter((id): id is string => typeof id === 'string' && id.length > 0)),
              );

              await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                currentOrgId: orgId,
                orgIds: mergedOrgIds,
                updatedAt: serverTimestamp(),
              }, { merge: true });
            } catch (error) {
              handleFirestoreError(error, OperationType.WRITE, 'users/org-membership-repair');
            }
          }
        }
        
        setUser(firebaseUser);
        setOrg(orgId || null);
        setNeedsOrgSetup(!orgId);
        if (!orgId) {
          setProject(null);
          return;
        }
        try {
          const orgRef = doc(db, 'organizations', orgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists() && !orgSnap.data().inviteCode) {
            const inviteCode = await generateUniqueInviteCode();
            await setDoc(orgRef, { inviteCode }, { merge: true });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `organizations/${orgId}`);
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        if (unsubscribeUserDoc) unsubscribeUserDoc();
        unsubscribeUserDoc = onSnapshot(userDocRef, async (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as any;
          const role = (data?.role || 'viewer') as AppRole;
          setUserRole(role);
          const activeOrgId = useAppStore.getState().currentOrgId;
          if (data?.currentOrgId && data.currentOrgId !== activeOrgId) {
            setOrg(data.currentOrgId);
            setProject(null);
          }
        });

        // Initialize first project
        try {
          const projectsQuery = query(collection(db, `organizations/${orgId}/projects`), limit(1));
          const projectsSnap = await getDocs(projectsQuery);
          if (!projectsSnap.empty) {
            setProject(projectsSnap.docs[0].id);
          } else {
            // Create a default project if none exists
            const projectRef = doc(collection(db, `organizations/${orgId}/projects`));
            await setDoc(projectRef, {
              id: projectRef.id,
              orgId: orgId,
              name: 'Default Project',
              environment: 'prod',
              createdAt: serverTimestamp()
            });
            setProject(projectRef.id);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `organizations/${orgId}/projects`);
        }
      } else {
        setUser(null);
        setOrg(null);
        setProject(null);
        setUserRole('viewer');
        if (unsubscribeUserDoc) {
          unsubscribeUserDoc();
          unsubscribeUserDoc = null;
        }
      }
      } catch (error) {
        console.error('Auth bootstrap failed', error);
        setUser(firebaseUser ?? null);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) unsubscribeUserDoc();
    };
  }, [setUser, setOrg, setProject]);

  useEffect(() => {
    if (!canAccessTab(userRole, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, userRole]);

  useEffect(() => {
    const acceptInvite = async () => {
      if (!user || inviteHandledRef.current) return;
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
        const inviteRef = doc(db, `organizations/${orgId}/invites`, inviteId);
        const inviteSnap = await getDoc(inviteRef);
        if (!inviteSnap.exists()) {
          alert('Invite not found or expired.');
          window.history.replaceState({}, '', '/');
          return;
        }

        const invite = inviteSnap.data() as any;
        const inviteEmail = String(invite.email || '').toLowerCase();
        const userEmail = String(user.email || '').toLowerCase();
        if (invite.status !== 'pending' || invite.inviteToken !== token || inviteEmail !== userEmail) {
          alert('This invite is invalid for your account.');
          window.history.replaceState({}, '', '/');
          return;
        }

        const memberRef = doc(db, `organizations/${orgId}/members`, user.uid);
        await setDoc(memberRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || '',
          photoURL: user.photoURL || '',
          role: invite.role || 'viewer',
          joinedAt: serverTimestamp(),
        }, { merge: true });

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const existingOrgIds = (userSnap.exists() ? (userSnap.data().orgIds || []) : []) as string[];
        const mergedOrgIds = Array.from(new Set([orgId, ...existingOrgIds]));
        await setDoc(userRef, {
          currentOrgId: orgId,
          orgIds: mergedOrgIds,
        }, { merge: true });

        await updateDoc(inviteRef, {
          status: 'accepted',
          acceptedBy: user.uid,
          acceptedAt: serverTimestamp(),
        });

        setOrg(orgId);
        alert('Invite accepted. Welcome to the organization.');
      } catch (error) {
        console.error('Failed to accept invite', error);
        alert('Failed to accept invite. Please try again.');
      } finally {
        window.history.replaceState({}, '', '/');
      }
    };

    acceptInvite();
  }, [user, setOrg]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center gap-4 transition-colors duration-300">
        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center animate-pulse">
          <Zap className="text-zinc-950 w-6 h-6 fill-current" />
        </div>
        <p className="text-zinc-500 dark:text-zinc-400 font-mono text-sm tracking-widest animate-pulse">INITIALIZING NEXO CLOUD...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }
  if (needsOrgSetup) {
    return <OrganizationSetupPage onComplete={() => setNeedsOrgSetup(false)} />;
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
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'servers' && <Servers />}
            {activeTab === 'analytics' && <Analytics />}
            {activeTab === 'logs' && <Logs />}
            {activeTab === 'alerts' && <Alerts />}
            {activeTab === 'cost' && <Cost />}
            {activeTab === 'settings' && <Settings />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

const OrganizationSetupPage = ({ onComplete }: { onComplete: () => void }) => {
  const { user, setOrg, setProject } = useAppStore();
  const [orgName, setOrgName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const createOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !orgName.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const orgRef = doc(collection(db, 'organizations'));
      const orgId = orgRef.id;
      await setDoc(orgRef, { id: orgId, name: orgName.trim(), ownerId: user.uid, plan: 'free', createdAt: serverTimestamp() });
      await setDoc(doc(db, `organizations/${orgId}/members`, user.uid), { uid: user.uid, role: 'owner', joinedAt: serverTimestamp() });
      await setDoc(doc(db, 'users', user.uid), { currentOrgId: orgId, orgIds: [orgId], role: 'owner' }, { merge: true });
      const projectRef = doc(collection(db, `organizations/${orgId}/projects`));
      await setDoc(projectRef, { id: projectRef.id, orgId, name: 'Default Project', environment: 'prod', createdAt: serverTimestamp() });
      setOrg(orgId);
      setProject(projectRef.id);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization');
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="min-h-screen flex items-center justify-center p-6 bg-zinc-50"><form onSubmit={createOrg} className="w-full max-w-lg bg-white p-8 rounded-2xl border border-zinc-200 space-y-4"><h2 className="text-2xl font-bold">Create your organization</h2><input value={orgName} onChange={(e)=>setOrgName(e.target.value)} placeholder="Organization name" className="w-full border border-zinc-300 rounded-xl px-4 py-3"/>{error && <p className="text-sm text-red-600">{error}</p>}<button disabled={submitting || !orgName.trim()} className="w-full bg-zinc-900 text-white rounded-xl py-3">{submitting ? 'Creating...' : 'Create organization'}</button></form></div>;
};

const LoginPage = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [submittingGoogle, setSubmittingGoogle] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
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
  useEffect(() => {
    setErrorMessage('');
  }, [mode]);

  return (
    <div className="min-h-screen w-screen bg-white text-zinc-900">
      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="px-8 md:px-14 py-14 lg:py-20 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-zinc-200 bg-zinc-50">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center shadow-sm">
              <Zap className="text-white w-6 h-6 fill-current" />
            </div>
            <span className="text-xl md:text-2xl font-extrabold tracking-tight text-zinc-900">Nexo Cloud</span>
          </div>

          <div className="max-w-2xl space-y-6">
            <p className="text-xs uppercase tracking-[0.28em] text-zinc-500 font-bold">Cloud Operations Platform</p>
            <h1 className="text-4xl md:text-6xl font-black leading-[1.05] tracking-tight text-zinc-900">
              Secure Infrastructure Visibility, Built For Real Teams
            </h1>
            <p className="text-zinc-600 text-base md:text-lg max-w-xl leading-relaxed">
              Monitor services, control access, and collaborate on incidents from one workspace designed for speed and reliability.
            </p>
          </div>

          <div className="text-xs text-zinc-500">
            By continuing, you agree to our <span className="underline decoration-zinc-400">Terms</span> and <span className="underline decoration-zinc-400">Privacy Policy</span>.
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
            </form>

            {errorMessage && (
              <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-xs text-left">
                {errorMessage}
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
