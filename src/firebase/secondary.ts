'use client';

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { secondaryFirebaseConfig } from './config';

let secondaryFirestoreInstance: Firestore | null = null;

/**
 * Initializes and returns the Firestore instance for the secondary Firebase project.
 * Used for fetching the material catalog/item list.
 */
export function getSecondaryFirestore(): Firestore {
  if (secondaryFirestoreInstance) return secondaryFirestoreInstance;
  
  const apps = getApps();
  // Check if the secondary app is already initialized, otherwise initialize it.
  const secondaryApp = apps.find(app => app.name === 'secondary') || initializeApp(secondaryFirebaseConfig, 'secondary');
  secondaryFirestoreInstance = getFirestore(secondaryApp);
  return secondaryFirestoreInstance;
}
