"use client";

import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useAuth as useFirebaseAuth, useFirestore, useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import type { Role } from '@/lib/types';
import { doc, setDoc } from 'firebase/firestore';

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

  const signInWithGoogle = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      if (user && firestore) {
        // This is a simplified user profile creation.
        // In a real app, you'd check if the user doc exists first.
        const userRef = doc(firestore, "users", user.uid);
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          // You might want a default role or a more complex role assignment logic
          customClaims: { role: 'Designer' } 
        }, { merge: true });
      }
      router.push('/dashboard');
    } catch (error) {
      console.error("Error during Google sign-in:", error);
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
    if (!auth || !firestore) return;
    
    // This is a simplified mock user login. 
    // It creates a "mock" user in Auth and Firestore for demo purposes.
    const mockUid = `mock-${role.toLowerCase()}`;
    const mockEmail = `${role.toLowerCase()}@example.com`;
    
    // We can't create a user on the client-side, so we just set the doc
    // This will not create a real Firebase Auth user, but it will let us
    // simulate one for the purpose of Firestore rules and UI.
    // In a real app, you'd have a backend function to create test users.
    
    const userRef = doc(firestore, "users", mockUid);
    await setDoc(userRef, {
        uid: mockUid,
        email: mockEmail,
        displayName: `${role} User`,
        photoURL: `https://i.pravatar.cc/150?u=${mockUid}`,
        customClaims: { role: role }
    }, { merge: true });

    // The `useUser` hook will pick up on the logged in user state.
    // For a true mock, you'd need to use Firebase's client-side testing utilities
    // to sign in as this user, but that's more complex.
    // For now, we'll just use Google sign-in for real auth.
    alert(`To test as a ${role}, please sign in with Google. Role-based access is configured in Firestore rules, and a 'users' document will be created on first sign-in.`);
    await signInWithGoogle();
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
