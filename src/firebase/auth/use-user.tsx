
"use client";

import { useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { useUser as useFirebaseUserHook, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import type { User as AppUser } from '@/lib/types';
import { doc } from 'firebase/firestore';

export interface UseUserHook {
  user: AppUser | null;
  loading: boolean;
}

// This maps the Firebase Auth user to your application's user type.
const mapFirebaseUserToAppUser = (
  firebaseUser: AuthUser,
  profileData: any
): AppUser | null => {
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || 'No email',
    name: profileData?.firstName ? `${profileData.firstName} ${profileData.lastName}` : firebaseUser.displayName || 'Anonymous User',
    avatarUrl: profileData?.avatarUrl || firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
    role: profileData?.role || 'Designer', // Default role
    verified: firebaseUser.emailVerified,
  };
};

export function useUser(): UseUserHook {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useFirebaseUserHook();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !firebaseUser) return null;
    return doc(firestore, `users/${firebaseUser.uid}/profile`);
  }, [firestore, firebaseUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const user = useMemo(() => {
    if (firebaseUser && userProfile) {
      return mapFirebaseUserToAppUser(firebaseUser, userProfile);
    }
    // Return a temporary user object while profile is loading
    if (firebaseUser) {
       return mapFirebaseUserToAppUser(firebaseUser, {});
    }
    return null;
  }, [firebaseUser, userProfile]);

  return { user, loading: isAuthLoading || isProfileLoading };
}
