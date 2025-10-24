
"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { Customer } from '@/lib/types';
import { useUser } from '@/firebase/auth/use-user';
import { v4 as uuidv4 } from 'uuid';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';

interface CustomerContextType {
  customers: Customer[];
  loading: boolean;
  getCustomerById: (id: string) => Customer | undefined;
  addCustomer: (customer: Omit<Customer, 'id'| 'ownerId'>) => Promise<string | undefined>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();

  useEffect(() => {
    setCustomers(MOCK_CUSTOMERS);
    setLoading(false);
  }, []);

  const getCustomerById = (id: string) => {
    return customers.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Omit<Customer, 'id'| 'ownerId'>): Promise<string | undefined> => {
    if (!user) {
      console.error("User not available");
      return;
    };
    
    const newCustomer: Customer = {
      ...customerData,
      id: uuidv4(),
      ownerId: user.id
    };

    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer.id;
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
