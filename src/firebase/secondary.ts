'use client';

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import { secondaryFirebaseConfig } from './config';

let secondaryAppInstance: FirebaseApp | null = null;
let secondaryFirestoreInstance: Firestore | null = null;
let secondaryAuthInstance: Auth | null = null;

/**
 * Initializes and returns the secondary Firebase app instance.
 */
export function getSecondaryApp(): FirebaseApp {
  if (secondaryAppInstance) return secondaryAppInstance;
  
  const apps = getApps();
  secondaryAppInstance = apps.find(app => app.name === 'secondary') || initializeApp(secondaryFirebaseConfig, 'secondary');
  return secondaryAppInstance;
}

/**
 * Initializes and returns the Firestore instance for the secondary Firebase project.
 * Used for fetching the material catalog/item list.
 */
export function getSecondaryFirestore(): Firestore {
  if (secondaryFirestoreInstance) return secondaryFirestoreInstance;
  
  const app = getSecondaryApp();
  secondaryFirestoreInstance = getFirestore(app);
  return secondaryFirestoreInstance;
}

/**
 * Initializes and returns the Auth instance for the secondary Firebase project.
 */
export function getSecondaryAuth(): Auth {
  if (secondaryAuthInstance) return secondaryAuthInstance;
  
  const app = getSecondaryApp();
  secondaryAuthInstance = getAuth(app);
  return secondaryAuthInstance;
}

/**
 * Ensures the user is authenticated (anonymously) on the secondary Firebase app.
 * This is necessary for satisfy security rules that require 'request.auth != null'.
 */
export async function ensureSecondaryAuth() {
  const auth = getSecondaryAuth();
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error("Failed to authenticate with secondary Firebase project:", error);
    }
  }
}
