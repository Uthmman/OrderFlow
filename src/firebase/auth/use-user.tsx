
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(auth?.currentUser || null);
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
          setLoading(false);
        } else {
          // If mock user is cleared, rely on Firebase auth state
          if (auth?.currentUser) {
            setFirebaseUser(auth.currentUser);
          } else {
            setUser(null);
            setFirebaseUser(null);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Failed to parse mock user from localStorage", error);
        localStorage.removeItem(MOCK_USER_STORAGE_KEY);
        setUser(null);
        setLoading(false);
      }
    };

    handleStorageChange(); // Initial check

    window.addEventListener('storage', handleStorageChange);
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
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      // If a mock user is active, don't process the real auth state change
      if (localStorage.getItem(MOCK_USER_STORAGE_KEY)) {
        return;
      }
      setFirebaseUser(authUser);
    });

    return () => unsubscribe();
  }, [auth]);

  const userRef = useMemo(() => {
      if (!firestore || !firebaseUser) return null;
      return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);


  useEffect(() => {
    // This effect runs when userRef changes (i.e., a real user logs in/out)
    // or when the mock user is cleared.
    if (localStorage.getItem(MOCK_USER_STORAGE_KEY)) {
      // Mock user is handled by the other effect, so we do nothing here.
      return;
    }

    if (!userRef) {
      setUser(null);
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
            // This can happen if the user exists in Auth but not in Firestore.
            // You might want to create the user document here.
            // For now, we'll treat them as not fully logged in.
            setUser(null);
        }
        setLoading(false);
    }, (error) => {
        console.error("Error fetching user document:", error);
        setUser(null);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userRef]);

  return { user, firebaseUser, loading };
}
