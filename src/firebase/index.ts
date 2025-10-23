import { initializeApp, getApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Provides a memoized version of the Firebase app, auth, and firestore instances.
let app: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

function initializeFirebase() {
  if (typeof window !== 'undefined') {
    if (!app) {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      auth = getAuth(app);
      firestore = getFirestore(app);
    }
  }
  return { app, auth, firestore };
}

export { initializeFirebase };
export * from './provider';
export * from './client-provider';
export * from './auth/use-user';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
