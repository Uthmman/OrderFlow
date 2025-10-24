
"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import type { Customer } from '@/lib/types';
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
  const { toast } = useToast();
  const customers = MOCK_CUSTOMERS;
  const loading = false;

  const getCustomerById = (id: string) => {
    return customers?.find(customer => customer.id === id);
  };
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    console.log("Adding customer (mock):", customerData);
    const newId = `cust-${Math.random().toString(36).substr(2, 9)}`;
    toast({
        title: "Mock Action",
        description: "Customer creation is not implemented in mock mode.",
    });
    return newId;
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      console.log("Updating customer (mock):", customerData);
        toast({
            title: "Mock Action",
            description: "Customer updates are not implemented in mock mode.",
        });
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
