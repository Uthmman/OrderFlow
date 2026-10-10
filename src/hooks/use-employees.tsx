
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';
import type { Employee } from '@/lib/types';

interface EmployeeContextType {
  employees: Employee[];
  loading: boolean;
}

const EmployeeContext = createContext<EmployeeContextType | undefined>(undefined);

export function EmployeeProvider({ children }: { children: ReactNode }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const initialize = async () => {
      try {
        await ensureSecondaryAuth();
        const db = getSecondaryFirestore();
        const q = query(collection(db, 'employees'), orderBy('name', 'asc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Employee[];
          setEmployees(results);
          setLoading(false);
        }, (error) => {
          console.error("Employee secondary fetch error:", error);
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to initialize secondary employees hook:", err);
        setLoading(false);
      }
    };

    initialize();
    return () => unsubscribe?.();
  }, []);

  const value = useMemo(() => ({
    employees,
    loading,
  }), [employees, loading]);

  return (
    <EmployeeContext.Provider value={value}>
      {children}
    </EmployeeContext.Provider>
  );
}

export function useEmployees() {
  const context = useContext(EmployeeContext);
  if (context === undefined) {
    throw new Error('useEmployees must be used within an EmployeeProvider');
  }
  return context;
}
