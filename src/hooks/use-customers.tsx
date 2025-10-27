
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useCollection, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
    const newCustomerRef = doc(customersRef);
    const newCustomerId = newCustomerRef.id;
    
    const newCustomer = {
      ...customerData,
      id: newCustomerId,
      orderIds: [],
      reviews: [],
      ownerId: 'anonymous' // Since there is no auth
    };

    updateDocumentNonBlocking(newCustomerRef, newCustomer);
    return newCustomerId;
  };

  const addOrderToCustomer = async(customerId: string, orderId: string) => {
    if (!firestore) return;
    const customerRef = doc(firestore, 'customers', customerId);
    updateDocumentNonBlocking(customerRef, {
      orderIds: arrayUnion(orderId)
    });
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      if (!firestore) return;
      const customerRef = doc(firestore, 'customers', customerData.id);
      updateDocumentNonBlocking(customerRef, { ...customerData });
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
