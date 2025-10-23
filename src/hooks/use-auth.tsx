
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { Role, User } from '@/lib/types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';

interface AuthContextType {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsMockUser: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MOCK_USER_STORAGE_KEY = 'mockUser';

const mockUsers: Record<Role, User> = {
    Admin: { id: 'admin-001', name: 'Admin User', email: 'admin@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=admin', role: 'Admin' },
    Manager: { id: 'manager-001', name: 'Manager User', email: 'manager@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=manager', role: 'Manager' },
    Sales: { id: 'sales-001', name: 'Sales User', email: 'sales@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=sales', role: 'Sales' },
    Designer: { id: 'designer-001', name: 'Designer User', email: 'designer@example.com', avatarUrl: 'https://i.pravatar.cc/150?u=designer', role: 'Designer' },
};


export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const signInWithGoogle = async () => {
    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Firebase not initialized."});
        return;
    }

    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;

        const userRef = doc(firestore, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            // New user, create a document in Firestore
            await setDoc(userRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                customClaims: { role: 'Designer' } // Default role
            });
             toast({ title: "Account Created", description: "Your account has been successfully created."});
        }
        
        router.push('/dashboard');

    } catch (error: any) {
        console.error("Error during Google sign-in:", error);
        toast({
            variant: "destructive",
            title: "Sign-in Failed",
            description: error.message || "An unexpected error occurred."
        });
    }
  };

  const signOut = async () => {
    // Clear mock user from localStorage
    localStorage.removeItem(MOCK_USER_STORAGE_KEY);
    // Dispatch a custom event to notify other components (like useUser hook)
    window.dispatchEvent(new Event('mock-user-change'));

    // Also sign out from Firebase if there's a real session
    if (auth && auth.currentUser) {
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out from Firebase:", error);
        }
    }
    router.push('/login');
  };

  const signInAsMockUser = async (role: Role) => {
    const mockUser = mockUsers[role];
    localStorage.setItem(MOCK_USER_STORAGE_KEY, JSON.stringify(mockUser));
    // Dispatch a custom event to notify other components (like useUser hook)
    window.dispatchEvent(new Event('mock-user-change'));
    router.push('/dashboard');
  };


  return (
    <AuthContext.Provider value={{ signInWithGoogle, signOut, signInAsMockUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
