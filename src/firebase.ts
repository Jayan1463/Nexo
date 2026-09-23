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
import { getFirestore, connectFirestoreEmulator, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const app = initializeApp(useEmulators
  ? { ...firebaseConfig, projectId: 'demo-nexo-e2e', authDomain: 'demo-nexo-e2e.firebaseapp.com' }
  : firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
