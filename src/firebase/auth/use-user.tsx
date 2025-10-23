
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

export function useUser(): UseUserHook {
  const auth = useAuth();
  const firestore = useFirestore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(auth?.currentUser || null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Effect for handling real Firebase auth state
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      setFirebaseUser(authUser);
    });

    return () => unsubscribe();
  }, [auth]);

  const userRef = useMemo(() => {
      if (!firestore || !firebaseUser) return null;
      return doc(firestore, 'users', firebaseUser.uid);
  }, [firestore, firebaseUser]);


  useEffect(() => {
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
                 role: data.role || 'Designer',
                 verified: data.verified || false,
                 customClaims: data.customClaims
             });
        } else {
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
