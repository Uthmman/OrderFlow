
"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { Customer } from '@/lib/types';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, 'id'| 'ownerId'>) => Promise<string | undefined>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  
  const customersCollection = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'customers') : null),
    [firestore, user]
  );
  const { data: customers, loading } = useCollection<Customer>(customersCollection);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Omit<Customer, 'id'| 'ownerId'>): Promise<string | undefined> => {
    if (!firestore || !user) {
      console.error("Firestore or user not available");
      return;
    };

    const customersCollectionRef = collection(firestore, 'customers');
    const newCustomerData = {
      ...customerData,
      ownerId: user.id,
    };
    
    try {
      const newCustomerDoc = await addDoc(customersCollectionRef, newCustomerData)
        .catch(error => {
            errorEmitter.emit(
              'permission-error',
              new FirestorePermissionError({
                path: customersCollectionRef.path,
                operation: 'create',
                requestResourceData: newCustomerData,
              })
            );
            // Re-throw to be caught by the outer try-catch and prevent returning an id
            throw error;
        });
      return newCustomerDoc.id;
    } catch (error) {
      console.error("Failed to add customer", error);
      return undefined;
    }
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
