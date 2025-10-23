"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { Customer } from '@/lib/types';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, 'id' | 'ownerId'>) => Promise<string>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { data: customers, loading } = useCollection<Customer>(firestore ? collection(firestore, 'customers') : null);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Omit<Customer, 'id' | 'ownerId'>) => {
    if (!firestore || !user) throw new Error("Firestore or user not available");
    const customersCollection = collection(firestore, 'customers');
    const newCustomerDoc = await addDoc(customersCollection, {
      ...customerData,
      ownerId: user.id,
    });
    return newCustomerDoc.id;
  };

  return (
    <CustomerContext.Provider value={{ customers: customers || [], loading, getCustomerById, addCustomer }}>
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
