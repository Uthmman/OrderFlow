"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { Customer } from '@/lib/types';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { data: customers, loading } = useCollection<Customer>(firestore ? collection(firestore, 'customers') : null);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };

  return (
    <CustomerContext.Provider value={{ customers: customers || [], loading, getCustomerById }}>
      {children}
    </CustomerContext.Provider>
  );
}

export function useCustomers() {
  const context = useContext(CustomerContext);
  if (context === undefined) {
    throw new Error('useCustomers must be used within a CustomerProvider');
  }
  return context;
}
