
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
import type { User as FirebaseAuthUser } from 'firebase/auth';

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
        // This case might happen if the user record wasn't created properly
        setUserProfile(null); 
      }
      setProfileLoading(false);
    }, (error) => {
        console.error("Error fetching user profile:", error);
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
  const usersColRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: areUsersLoading } = useCollection<AppUser>(usersColRef);

  const createUserProfile = useCallback(async (uid: string, data: Partial<Omit<AppUser, 'id' | 'role'>>) => {
    const userRef = doc(firestore, 'users', uid);
    const isAdmin = data.email === 'zenbabfurniture@gmail.com';
    const newUser: AppUser = {
      id: uid,
      name: data.name || 'New User',
      email: data.email || '',
      avatarUrl: data.avatarUrl || '',
      role: isAdmin ? 'Admin' : 'Pending',
    };
    // Use non-blocking write
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
  
  const allUsersValue = useMemo(() => ({
    users: users || [],
    loading: areUsersLoading,
    user: userProfile || null,
    createUserProfile,
    updateUserRole,
  }), [users, areUsersLoading, userProfile, createUserProfile, updateUserRole]);


  return (
    <UserContext.Provider value={singleUserValue}>
        <UsersContext.Provider value={allUsersValue}>
            {children}
        </UsersContext.Provider>
    </UserContext.Provider>
  );
}

// Hook for accessing the current user's profile
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

// Hook for managing all users (admin)
export function useUsers() {
  const context = useContext(UsersContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}
