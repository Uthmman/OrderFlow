
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

  const user = useMemo(() => {
    if (firebaseUser) {
      // For now, we are not fetching the profile from Firestore to avoid the permission error.
      // We will construct a basic user object from the auth data.
      return mapFirebaseUserToAppUser(firebaseUser, {});
    }
    return null;
  }, [firebaseUser]);

  return { user, loading: isAuthLoading };
}
