
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
  const role = profileData?.role || 'Designer';
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || 'No email',
    name: profileData?.firstName ? `${profileData.firstName} ${profileData.lastName}` : firebaseUser.displayName || `${role} User`,
    avatarUrl: profileData?.avatarUrl || firebaseUser.photoURL || `https://i.pravatar.cc/150?u=${firebaseUser.uid}`,
    role: role,
    verified: firebaseUser.emailVerified,
  };
};

export function useUser(): UseUserHook {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useFirebaseUserHook();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(
    () => (firebaseUser ? doc(firestore, `users/${firebaseUser.uid}`) : null),
    [firestore, firebaseUser]
  );

  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  const user = useMemo(() => {
    if (firebaseUser) {
      return mapFirebaseUserToAppUser(firebaseUser, userProfile);
    }
    return null;
  }, [firebaseUser, userProfile]);

  return { user, loading: isAuthLoading || isProfileLoading };
}
