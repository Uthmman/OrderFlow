
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { initializeFirebase } from '@/firebase';
import type { Customer } from '@/lib/types';
import { useToast } from './use-toast';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }) => Promise<string>;
  updateCustomer: (customer: Customer) => Promise<void>;
  addOrderToCustomer: (customerId: string, orderId: string) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { firestore } = initializeFirebase();
  const { toast } = useToast();

  const customersRef = useMemo(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, loading } = useCollection<Customer>(customersRef);

  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers?.find(customer => customer.id === id);
  }, [customers]);
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    const docRef = await addDoc(customersRef, {
      ...customerData,
      orderIds: [],
      reviews: [],
      ownerId: 'anonymous' // Since there is no auth
    });
    // Now update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });
    return docRef.id;
  };

  const addOrderToCustomer = async(customerId: string, orderId: string) => {
    const customerRef = doc(firestore, 'customers', customerId);
    await updateDoc(customerRef, {
      orderIds: arrayUnion(orderId)
    });
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      const customerRef = doc(firestore, 'customers', customerData.id);
      await updateDoc(customerRef, { ...customerData });
  }

  const value = useMemo(() => ({
    customers: customers || [],
    loading,
    getCustomerById,
    addCustomer,
    updateCustomer,
    addOrderToCustomer,
  }), [customers, loading, getCustomerById]);

  return (
    <CustomerContext.Provider value={value}>
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
