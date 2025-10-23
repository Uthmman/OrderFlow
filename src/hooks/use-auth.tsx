
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { User } from '@/lib/types';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from './use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AuthContextType {
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
            const newUser = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
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
    <AuthContext.Provider value={{ signInWithGoogle, signOut }}>
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
