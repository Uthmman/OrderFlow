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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
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
      return;
    }

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
    });

    return () => unsubscribe();
  }, [userRef]);

  return { user, firebaseUser, loading };
}
