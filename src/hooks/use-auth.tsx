
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Role, User } from '@/lib/types';
import { useToast } from './use-toast';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  signInAsDemoUser: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useFirebaseAuth();
  const firestore = useFirestore();

  const signInAsDemoUser = async (role: Role) => {
    try {
      const userCredential = await signInAnonymously(auth);
      const user = userCredential.user;

      const MOCK_USER_DATA: Omit<User, 'id' | 'email' | 'verified'> = {
          name: `${role} User`,
          avatarUrl: `https://i.pravatar.cc/150?u=${role}`,
          role: role,
      }

      // Create a user profile in Firestore
      const userProfileRef = doc(firestore, `users/${user.uid}/profile`);
      await setDoc(userProfileRef, {
        firstName: role,
        lastName: 'User',
        email: user.email || `${role.toLowerCase()}@example.com`,
        role: role,
        createdAt: serverTimestamp(),
      });
      
      toast({
          title: "Logged In",
          description: `You are now logged in as ${role}.`,
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      toast({
        variant: 'destructive',
        title: "Login Failed",
        description: "Could not sign in. Please try again.",
      });
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      toast({
          title: "Logged Out",
          description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
       console.error("Sign out failed:", error);
       toast({
        variant: 'destructive',
        title: "Logout Failed",
        description: "Could not sign out. Please try again.",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ signInAsDemoUser, signOut }}>
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
