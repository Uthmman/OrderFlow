
"use client";

import { useMemo } from 'react';
import type { User as AuthUser } from 'firebase/auth';
import { useUser as useFirebaseUserHook } from '@/firebase';
import type { User as AppUser, Role } from '@/lib/types';
import { MOCK_USERS } from '@/lib/mock-data';


// This maps the Firebase Auth user to your application's user type.
const mapFirebaseUserToAppUser = (
  firebaseUser: AuthUser,
  profileData?: any
): AppUser | null => {
  if (!firebaseUser) return null;

  // In our mock/demo setup, we can derive the role from the email or display name
  const isDemo = firebaseUser.isAnonymous;
  let role: Role = 'Designer'; // Default role
  
  if (isDemo && profileData) {
      role = profileData.role || 'Designer';
  } else if (isDemo && firebaseUser.displayName) {
      const name = firebaseUser.displayName.toLowerCase();
      if(name.includes('admin')) role = 'Admin';
      else if (name.includes('manager')) role = 'Manager';
      else if (name.includes('sales')) role = 'Sales';
  }

  const mockUser = MOCK_USERS[role];

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || mockUser.email,
    name: profileData?.name || firebaseUser.displayName || mockUser.name,
    avatarUrl: profileData?.avatarUrl || firebaseUser.photoURL || mockUser.avatarUrl,
    role: role,
    verified: firebaseUser.emailVerified,
  };
};

export function useUser(): { user: AppUser | null, loading: boolean } {
  const { user: firebaseUser, isUserLoading: isAuthLoading } = useFirebaseUserHook();

  // Since we are not fetching from firestore, profile loading is false.
  const isProfileLoading = false; 

  const user = useMemo(() => {
    if (firebaseUser) {
      // For demo purposes, we can pass a mock profile based on role if needed
      const role: Role = firebaseUser.displayName as Role || 'Designer';
      const mockProfile = MOCK_USERS[role];
      return mapFirebaseUserToAppUser(firebaseUser, mockProfile);
    }
    return null;
  }, [firebaseUser]);

  return { user, loading: isAuthLoading || isProfileLoading };
}
