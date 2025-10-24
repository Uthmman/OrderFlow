
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import type { Customer } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { 
    useFirestore, 
    useCollection, 
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    useMemoFirebase
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';


interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }) => Promise<string>;
  updateCustomer: (customer: Customer) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const customersCollection = useMemoFirebase(() => user ? collection(firestore, 'customers') : null, [firestore, user]);
  const { data: customers, isLoading: loading } = useCollection<Customer>(customersCollection);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    if (!user) {
      throw new Error("User not available");
    }
    
    const collectionRef = collection(firestore, 'customers');

    const newCustomer: Omit<Customer, 'id'> = {
      name: customerData.name,
      email: customerData.email || '',
      phoneNumbers: customerData.phoneNumbers || [{type: "Mobile", number: "Not provided"}],
      gender: customerData.gender || 'Other',
      location: customerData.location || { town: "Not specified" },
      avatarUrl: customerData.avatarUrl || `https://i.pravatar.cc/150?u=${customerData.email || customerData.name}`,
      ownerId: user.id,
      orderIds: [],
      reviews: [],
      ...customerData,
    };
    
    const docRef = await addDocumentNonBlocking(collectionRef, newCustomer);
    return docRef.id;
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      const docRef = doc(firestore, `customers/${customerData.id}`);
      updateDocumentNonBlocking(docRef, customerData);
  }

  const value = useMemo(() => ({
    customers: customers || [],
    loading,
    getCustomerById,
    addCustomer,
    updateCustomer
  }), [customers, loading]);

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
