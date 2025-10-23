
"use client";

import { useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export interface UseUserHook {
  user: User | null;
  loading: boolean;
}

const MOCK_USERS: Record<string, User> = {
  Admin: {
    id: 'admin-user-id',
    name: 'Admin User',
    email: 'admin@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=admin',
    role: 'Admin',
    verified: true,
  },
  Manager: {
    id: 'manager-user-id',
    name: 'Manager User',
    email: 'manager@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=manager',
    role: 'Manager',
    verified: true,
  },
  Sales: {
    id: 'sales-user-id',
    name: 'Sales User',
    email: 'sales@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=sales',
    role: 'Sales',
    verified: true,
  },
  Designer: {
    id: 'designer-user-id',
    name: 'Designer User',
    email: 'designer@example.com',
    avatarUrl: 'https://i.pravatar.cc/150?u=designer',
    role: 'Designer',
    verified: true,
  },
};


export function useUser(): UseUserHook {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = () => {
      try {
        const storedUserRole = localStorage.getItem('demoUserRole');
        if (storedUserRole && MOCK_USERS[storedUserRole]) {
          setUser(MOCK_USERS[storedUserRole]);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Could not access localStorage:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'demoUserRole') {
        checkUser();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };

  }, [router]);

  return { user, loading };
}
