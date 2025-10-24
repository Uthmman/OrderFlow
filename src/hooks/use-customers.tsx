
"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import type { Customer } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { 
    useFirestore, 
    useCollection,
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    useMemoFirebase,
} from '@/firebase';
import { collection, doc } from 'firebase/firestore';

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
  const { toast } = useToast();
  const firestore = useFirestore();

  const customersCollection = useMemoFirebase(() => {
    if (firestore) {
        return collection(firestore, 'customers');
    }
    return null;
  }, [firestore]);

  const { data: customers, isLoading: loading } = useCollection<Customer>(customersCollection);

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    if (!user || !firestore) {
      throw new Error("User or Firestore not available");
    }
    
    const newCustomerData = {
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
    
    const docRef = await addDocumentNonBlocking(collection(firestore, 'customers'), newCustomerData);
    return docRef.id;
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      if (!firestore) {
          throw new Error("Firestore not available");
      }
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
