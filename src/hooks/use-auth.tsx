
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Role } from '@/lib/types';
import { useToast } from './use-toast';

interface AuthContextType {
  signInAsDemoUser: (role: Role) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();

  const signInAsDemoUser = (role: Role) => {
    localStorage.setItem('demoUserRole', role);
    // Dispatch a storage event to notify other tabs/windows
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'demoUserRole',
        newValue: role,
    }));
    toast({
        title: "Logged In",
        description: `You are now logged in as ${role}.`,
    });
    router.push('/dashboard');
  };

  const signOut = () => {
    localStorage.removeItem('demoUserRole');
     // Dispatch a storage event to notify other tabs/windows
     window.dispatchEvent(new StorageEvent('storage', {
        key: 'demoUserRole',
        newValue: null,
    }));
    toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
    });
    router.push('/login');
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
