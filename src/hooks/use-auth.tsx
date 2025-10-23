
"use client";

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth, useFirestore, useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { Role } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from './use-toast';

interface AuthContextType {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signInAsMockUser: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const { user, loading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && firestore) {
        const userRef = doc(firestore, "users", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          customClaims: { role: 'Designer' } 
        }, { merge: true });
      }
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Error during Google sign-in:", error);
      if (error.code === 'auth/popup-blocked') {
        toast({
            variant: "destructive",
            title: "Popup Blocked",
            description: "Your browser blocked the sign-in popup. Please allow popups for this site and try again."
        });
      } else {
        toast({
            variant: "destructive",
            title: "Sign-in Error",
            description: error.message
        });
      }
    }
  };

  const signOut = async () => {
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const signInAsMockUser = async (role: Role) => {
    toast({
        title: "Feature Unavailable",
        description: `To test as a ${role}, please sign in with Google. Role-based access is configured via Firestore security rules.`,
    });
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
