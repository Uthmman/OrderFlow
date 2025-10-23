
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import type { User } from '@/lib/types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AuthContextType {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useFirebaseAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleUserDocument = async (firebaseUser: import('firebase/auth').User, additionalData: { displayName?: string } = {}) => {
     if (!firestore) return;
     const userRef = doc(firestore, 'users', firebaseUser.uid);
     const userSnap = await getDoc(userRef);

     if (!userSnap.exists()) {
         const newUser = {
             uid: firebaseUser.uid,
             email: firebaseUser.email,
             displayName: firebaseUser.displayName || additionalData.displayName,
             photoURL: firebaseUser.photoURL || `https://avatar.vercel.sh/${firebaseUser.email}.png`,
             customClaims: { role: 'Designer' }
         };
         setDoc(userRef, newUser)
           .then(() => {
             toast({ title: "Account Created", description: "Your account has been successfully created."});
           })
           .catch(error => {
               errorEmitter.emit(
                 'permission-error',
                 new FirestorePermissionError({
                   path: userRef.path,
                   operation: 'create',
                   requestResourceData: newUser,
                 })
               );
           });
     }
  }

  const signInWithGoogle = async () => {
    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Firebase not initialized."});
        return;
    }

    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        await handleUserDocument(result.user);
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

  const signUpWithEmail = async (email: string, password: string, name: string) => {
    if (!auth || !firestore) {
        toast({ variant: "destructive", title: "Firebase not initialized."});
        return;
    }
    try {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await handleUserDocument(result.user, { displayName: name });
        router.push('/dashboard');
    } catch (error: any) {
        console.error("Error during email sign-up:", error);
        toast({
            variant: "destructive",
            title: "Sign-up Failed",
            description: error.message || "An unexpected error occurred."
        });
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
      if (!auth) return;
      try {
          await signInWithEmailAndPassword(auth, email, password);
          router.push('/dashboard');
      } catch (error: any) {
          console.error("Error during email sign-in:", error);
          toast({
              variant: "destructive",
              title: "Sign-in Failed",
              description: error.message || "An unexpected error occurred."
          });
      }
  };

  const signOut = async () => {
    if (auth) {
        try {
            await firebaseSignOut(auth);
            router.push('/login');
        } catch (error) {
            console.error("Error signing out from Firebase:", error);
        }
    }
  };

  return (
    <AuthContext.Provider value={{ signInWithGoogle, signOut, signUpWithEmail, signInWithEmail }}>
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

    