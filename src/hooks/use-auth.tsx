"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { User, Role } from '@/lib/types';
import { mockUsers } from '@/lib/mock-data';

interface AuthContextType {
  user: User | null;
  login: (role: Role) => void;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('orderflow-user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem('orderflow-user');
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (role: Role) => {
    const userToLogin = mockUsers.find(u => u.role === role);
    if (userToLogin) {
      setUser(userToLogin);
      localStorage.setItem('orderflow-user', JSON.stringify(userToLogin));
      router.push('/dashboard');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('orderflow-user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
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
