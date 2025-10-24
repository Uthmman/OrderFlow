
"use client";

import { useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { useUser as useFirebaseUserHook, useDoc, useFirestore } from '@/firebase';
import type { User as AppUser } from '@/lib/types';
import { doc } from 'firebase/firestore';

const mapFirebaseUserToAppUser = (
  firebaseUser: AuthUser,
  profileData?: any
): AppUser | null => {
  if (!firebaseUser) return null;

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: profileData?.name || firebaseUser.displayName || 'Unnamed User',
    avatarUrl: profileData?.avatarUrl || firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
    role: profileData?.role || 'Designer',
    verified: firebaseUser.emailVerified,
    customClaims: profileData?.customClaims,
  };
};

export function useUser(): { user: AppUser | null, loading: boolean } {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useFirebaseUserHook();
  const firestore = useFirestore();

  const userDocRef = useMemo(() => {
    if (firestore && firebaseUser) {
      return doc(firestore, `users/${firebaseUser.uid}`);
    }
    return null;
  }, [firestore, firebaseUser]);

  const { data: profile, isLoading: isProfileLoading } = useDoc(userDocRef);

  const user = useMemo(() => {
    if (firebaseUser) {
      return mapFirebaseUserToAppUser(firebaseUser, profile);
    }
    return null;
  }, [firebaseUser, profile]);

  return { user, loading: isAuthLoading || isProfileLoading };
}
