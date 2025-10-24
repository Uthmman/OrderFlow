
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { useToast } from './use-toast';
import { useAuth as useFirebaseAuth } from '@/firebase';
import { 
  signInAnonymously, 
  signOut as firebaseSignOut, 
  updateProfile,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';

interface AuthContextType {
  signInAsDemoUser: (role: Role) => void;
  signOut: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useFirebaseAuth();

  const signInAsDemoUser = async (role: Role) => {
    try {
      const userCredential = await signInAnonymously(auth);
      // We are using displayName to persist the role for anonymous auth
      await updateProfile(userCredential.user, { displayName: role });
      
      toast({
          title: "Logged In",
          description: `You are now logged in as ${role}.`,
      });
      // Force a reload to ensure all contexts are reset and using the new auth state
      router.push('/dashboard');
      router.refresh();

    } catch (error) {
      console.error("Anonymous sign-in failed:", error);
      toast({
        variant: 'destructive',
        title: "Login Failed",
        description: "Could not sign in. Please try again.",
      });
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      toast({
          title: "Logged In",
          description: "You have successfully signed in.",
      });
      router.push('/dashboard');
    } catch(error: any) {
       console.error("Sign in failed:", error);
       toast({
        variant: 'destructive',
        title: "Login Failed",
        description: error.message || "Could not sign in. Please check your credentials.",
      });
    }
  }
  
  const signUpWithEmail = async (email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      // You can set a default role or name here if you want
      await updateProfile(userCredential.user, { displayName: 'Designer' });
      toast({
          title: "Account Created",
          description: "You have been successfully signed up.",
      });
      router.push('/dashboard');
    } catch(error: any) {
       console.error("Sign up failed:", error);
       toast({
        variant: 'destructive',
        title: "Sign Up Failed",
        description: error.message || "Could not create account. Please try again.",
      });
    }
  }


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
    <AuthContext.Provider value={{ signInAsDemoUser, signOut, signInWithEmail, signUpWithEmail }}>
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
