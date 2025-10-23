"use client";

import { useState, useEffect, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { useAuth, useFirestore } from '../provider';
import { doc, onSnapshot } from 'firebase/firestore';
import { FirebaseUser, User } from '@/lib/types';

export interface UseUserHook {
  user: User | null;
  firebaseUser: FirebaseAuthUser | null;
  loading: boolean;
}

const MOCK_USER_STORAGE_KEY = 'mockUser';

export function useUser(): UseUserHook {
  const auth = useAuth();
  const firestore = useFirestore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Effect for handling mock user state from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const mockUserJson = localStorage.getItem(MOCK_USER_STORAGE_KEY);
        if (mockUserJson) {
          const mockUser = JSON.parse(mockUserJson);
          setUser(mockUser);
          setFirebaseUser(null);
        } else {
          // If mock user is cleared, let the real auth state take over
          if (!auth?.currentUser) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Failed to parse mock user from localStorage", error);
        localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        setUser(null);
      }
      setLoading(false);
    };

    // Check initial state
    handleStorageChange();

    // Listen for changes to localStorage (e.g., from other tabs)
    window.addEventListener('storage', handleStorageChange);
    // Also listen for a custom event for same-tab updates
    window.addEventListener('mock-user-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mock-user-change', handleStorageChange);
    };
  }, [auth]);

  // Effect for handling real Firebase auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // If there's a mock user, don't override it with the real auth state
      if (localStorage.getItem(MOCK_USER_STORAGE_KEY)) {
        setLoading(false);
        return;
      }
      setFirebaseUser(user);
    });

    return () => unsubscribe();
  }, [auth]);

  const userRef = useMemo(() => {
      if (!firestore || !firebaseUser) return null;
      return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);


  useEffect(() => {
    if (!userRef) {
      // If there's no real user ref, it might be a mock user or no user at all.
      // The mock user effect already handles setting the user.
      // If no mock user and no real user, set user to null.
      if (!localStorage.getItem(MOCK_USER_STORAGE_KEY)) {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
        if(snapshot.exists()) {
             const data = snapshot.data() as FirebaseUser;
             setUser({
                 id: snapshot.id,
                 name: data.displayName || 'No Name',
                 email: data.email || 'No Email',
                 avatarUrl: data.photoURL || '',
                 role: data.customClaims?.role || 'Designer',
                 customClaims: data.customClaims
             });
        } else {
            setUser(null);
        }
        setLoading(false);
    }, () => {
        // On error, also set loading to false.
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userRef]);

  return { user, firebaseUser, loading };
}
