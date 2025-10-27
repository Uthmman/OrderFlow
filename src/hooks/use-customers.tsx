
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import type { Customer } from '@/lib/types';
import { useToast } from './use-toast';
import { MOCK_CUSTOMERS } from '@/lib/mock-data';

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
  const [customers, setCustomers] = useState<Customer[]>(MOCK_CUSTOMERS);
  const [loading, setLoading] = useState(false);

  const getCustomerById = useCallback((id: string): Customer | undefined => {
    return customers?.find(customer => customer.id === id);
  }, [customers]);
  
  const addCustomer = async (customerData: Partial<Omit<Customer, 'id'| 'ownerId' | 'orderIds' | 'reviews'>> & { name: string }): Promise<string> => {
    setLoading(true);
    const newCustomerId = `cust-${Date.now()}`;
    const newCustomer: Customer = {
      ...customerData,
      id: newCustomerId,
      orderIds: [],
      reviews: [],
      ownerId: 'anonymous'
    };
    setCustomers(prev => [...prev, newCustomer]);
    setLoading(false);
    return newCustomerId;
  };

  const addOrderToCustomer = async(customerId: string, orderId: string) => {
    setCustomers(prev => prev.map(c => 
        c.id === customerId ? { ...c, orderIds: [...c.orderIds, orderId] } : c
    ));
  };
  
  const updateCustomer = async (customerData: Customer): Promise<void> => {
      setLoading(true);
      setCustomers(prev => prev.map(c => c.id === customerData.id ? customerData : c));
      setLoading(false);
  }

  const value = useMemo(() => ({
    customers,
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
