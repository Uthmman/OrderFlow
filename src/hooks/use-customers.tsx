
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useState } from 'react';
import type { Customer } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { useToast } from './use-toast';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';

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

  // MOCK DATA IMPLEMENTATION
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const loading = false;


  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    if (!user) {
      throw new Error("User not available");
    }
    
    const customerId = `mock-cust-${Math.random().toString(36).substring(2, 9)}`;

    const newCustomer: Customer = {
      id: customerId,
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
    
    setCustomers(prev => [newCustomer, ...prev]);
    return customerId;
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      setCustomers(prev => prev.map(c => c.id === customerData.id ? customerData : c));
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
