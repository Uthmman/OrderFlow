

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
  addCustomer: (customer: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string, email: string }) => Promise<string>;
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
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string, email: string }): Promise<string> => {
    if (!user) {
      throw new Error("User not available");
    };
    
    const newCustomer: Customer = {
      name: customerData.name,
      email: customerData.email,
      phoneNumbers: customerData.phoneNumbers || [{type: "Mobile", number: "Not provided"}],
      gender: customerData.gender || 'Other',
      location: customerData.location || { town: "Not specified" },
      avatarUrl: customerData.avatarUrl || `https://i.pravatar.cc/150?u=${customerData.email || customerData.name}`,
      id: uuidv4(),
      ownerId: user.id,
      orderIds: [],
      reviews: [],
      ...customerData,
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
