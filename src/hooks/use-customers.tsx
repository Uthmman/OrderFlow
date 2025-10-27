
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, updateDoc, addDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import type { Customer } from '@/lib/types';
import { useToast } from './use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { addDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser } from './use-user';


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
  const { toast } = useToast();
  const { firestore } = useFirebase();
  const { user } = useUser();

  const customersRef = useMemoFirebase(() => collection(firestore, 'customers'), [firestore]);
  const { data: customers, isLoading: loading } = useCollection<Customer>(customersRef);

  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers?.find(customer => customer.id === id);
  }, [customers]);
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    if (!user) throw new Error("User must be logged in to add a customer.");

    const newCustomerRef = doc(collection(firestore, "customers"));
    const newCustomerId = newCustomerRef.id;

    const newCustomer: Customer = {
      ...customerData,
      id: newCustomerId,
      orderIds: [],
      reviews: [],
      ownerId: user.id,
      phoneNumbers: customerData.phoneNumbers || [],
      location: customerData.location || { town: '' },
      avatarUrl: customerData.avatarUrl || '',
      gender: customerData.gender || 'Other',
    };

    setDocumentNonBlocking(newCustomerRef, newCustomer, {});
    
    return newCustomerId;
  };

  const addOrderToCustomer = async(customerId: string, orderId: string) => {
    const customer = getCustomerById(customerId);
    if (customer) {
        const customerRef = doc(firestore, 'customers', customerId);
        const updatedOrderIds = [...customer.orderIds, orderId];
        updateDocumentNonBlocking(customerRef, { orderIds: updatedOrderIds });
    }
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      const customerRef = doc(firestore, 'customers', customerData.id);
      updateDocumentNonBlocking(customerRef, customerData);
  }

  const value = useMemo(() => ({
    customers: customers || [],
    loading,
    getCustomerById,
    addCustomer,
    updateCustomer,
    addOrderToCustomer,
  }), [customers, loading, getCustomerById, addCustomer, updateCustomer, addOrderToCustomer]);

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
