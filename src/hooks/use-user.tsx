
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import type { AppUser, Role } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from './use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

// Main user hook return type
interface UserHookReturnType {
  user: AppUser | null;
  loading: boolean;
  role: Role | null;
}

// Context for all users management
interface UsersContextType {
  users: AppUser[];
  loading: boolean;
  user: AppUser | null; // The current user's profile
  createUserProfile: (uid: string, data: Partial<Omit<AppUser, 'id' | 'role'>>) => Promise<void>;
  updateUserRole: (uid: string, role: Role) => Promise<void>;
  updateUserProfile: (uid: string, data: Partial<Omit<AppUser, 'id' | 'role' | 'dashboardOrderSortPreference'>>) => Promise<void>;
  updateUserPreferences: (uid: string, prefs: Partial<Pick<AppUser, 'orderSortPreference' | 'dashboardOrderSortPreference'>>) => void;
}

const UserContext = createContext<UserHookReturnType | undefined>(undefined);
const UsersContext = createContext<UsersContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const { firestore, user: authUser, isUserLoading: isAuthUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [isProfileLoading, setProfileLoading] = useState(true);

  // Effect to fetch user profile from Firestore when auth state changes
  useEffect(() => {
    if (isAuthUserLoading) {
      setProfileLoading(true);
      return;
    }
    
    if (!authUser) {
      setUserProfile(null);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    const userDocRef = doc(firestore, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as AppUser);
      } else {
        setUserProfile(null); 
      }
      setProfileLoading(false);
    }, (error) => {
        // Emitting specialized error instead of standard console.error
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            operation: 'get',
            path: userDocRef.path
        }));
        setUserProfile(null);
        setProfileLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, firestore, isAuthUserLoading]);

  
  const loading = isAuthUserLoading || isProfileLoading;
  const role = userProfile?.role || null;
  
  const singleUserValue = useMemo(() => ({
    user: userProfile,
    loading,
    role,
  }), [userProfile, loading, role]);

  // --- All Users Logic (for admin user management) ---
  // Only query the users collection if authenticated and user is an Admin
  const usersColRef = useMemoFirebase(() => {
    if (!authUser || role !== 'Admin') return null;
    return collection(firestore, 'users');
  }, [firestore, authUser, role]);

  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersColRef);

  const createUserProfile = useCallback(async (uid: string, data: Partial<Omit<AppUser, 'id' | 'role'>>) => {
    const userRef = doc(firestore, 'users', uid);
    const isAdmin = data.email === 'zenbabfurniture@gmail.com';

    let avatarUrl = data.avatarUrl || '';
    if (!avatarUrl) {
      const gender = (data as any).gender; 
      if (gender === 'Male') {
        avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${data.name || data.email}`;
      } else if (gender === 'Female') {
        avatarUrl = `https://avatar.iran.liara.run/public/girl?username=${data.name || data.email}`;
      } else {
        avatarUrl = `https://i.pravatar.cc/150?u=${data.email || data.name}`;
      }
    }

    const newUser: AppUser = {
      id: uid,
      name: data.name || 'New User',
      email: data.email || '',
      avatarUrl: avatarUrl,
      role: isAdmin ? 'Admin' : 'Pending',
    };
    setDocumentNonBlocking(userRef, newUser, { merge: true });
  }, [firestore]);

  const updateUserRole = useCallback(async (uid: string, role: Role) => {
    const userRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userRef, { role });
    toast({
        title: "User Updated",
        description: `User role has been changed to ${role}.`
    })
  }, [firestore, toast]);
  
  const updateUserProfile = useCallback(async (uid: string, data: Partial<Omit<AppUser, 'id' | 'role' | 'dashboardOrderSortPreference'>>) => {
    const userRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userRef, data);
  }, [firestore]);

  const updateUserPreferences = useCallback((uid: string, prefs: Partial<Pick<AppUser, 'orderSortPreference' | 'dashboardOrderSortPreference'>>) => {
    const userRef = doc(firestore, 'users', uid);
    updateDocumentNonBlocking(userRef, prefs);
  }, [firestore]);

  const allUsersValue = useMemo(() => ({
    users: users || [],
    loading: areUsersLoading,
    user: userProfile || null,
    createUserProfile,
    updateUserRole,
    updateUserProfile,
    updateUserPreferences,
  }), [users, areUsersLoading, userProfile, createUserProfile, updateUserRole, updateUserProfile, updateUserPreferences]);


  return (
    <UserContext.Provider value={singleUserValue}>
        <UsersContext.Provider value={allUsersValue}>
            {children}
        </UsersContext.Provider>
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

export function useUsers() {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}
