
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { MOCK_ORDERS } from '@/lib/mock-data';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => Promise<string | undefined>;
  updateOrder: (order: Order, newFiles?: File[]) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const orders = MOCK_ORDERS;
  const loading = false;

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    console.log("Adding order (mock):", orderData, newFiles);
    toast({
        title: "Mock Action",
        description: "Order creation is not implemented in mock mode.",
    });
    return `order-${Math.random().toString(36).substr(2, 9)}`;
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    console.log("Updating order (mock):", updatedOrderData, newFiles);
    toast({
        title: "Mock Action",
        description: "Order updates are not implemented in mock mode.",
    });
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    console.log("Deleting order (mock):", orderId, attachments);
    toast({
        title: "Mock Action",
        description: "Order deletion is not implemented in mock mode.",
    });
  };

  const getOrderById = (orderId: string) => {
    return orders?.find(order => order.id === orderId);
  };
  
  const value = useMemo(() => ({
      orders: orders || [],
      loading,
      addOrder,
      updateOrder,
      deleteOrder,
      getOrderById,
      uploadProgress,
  }), [orders, loading, uploadProgress]);

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within a OrderProvider');
  }
  return context;
}
