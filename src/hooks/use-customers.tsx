
"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useToast } from './use-toast';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }) => Promise<string>;
  updateCustomer: (customer: Customer) => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();

  const customersCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    // Assuming you want to fetch all customers. 
    // In a real app, you might want to scope this by user or role.
    return collection(firestore, 'customers');
  }, [firestore]);

  const { data: customers, isLoading: loading } = useCollection<Customer>(customersCollectionRef);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    if (!user || !firestore) {
      throw new Error("User or Firestore not available");
    }
    
    const customerRef = doc(collection(firestore, 'customers'));
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
    
    addDocumentNonBlocking(collection(firestore, 'customers'), newCustomer);
    
    return customerRef.id;
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      if (!firestore) throw new Error("Firestore not available");
      const customerRef = doc(firestore, 'customers', customerData.id);
      updateDocumentNonBlocking(customerRef, customerData);
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

