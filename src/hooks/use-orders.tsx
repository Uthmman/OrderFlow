
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { Timestamp } from 'firebase/firestore';
import type { Order, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
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
  const { addOrderToCustomer } = useCustomers();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [loading, setLoading] = useState(false);

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    // This is a mock implementation
    if (!files || files.length === 0) return [];
    
    const uploadedAttachments: OrderAttachment[] = [];
    for (const file of files) {
        uploadedAttachments.push({
            fileName: file.name,
            url: URL.createObjectURL(file),
            storagePath: `mock/orders/${orderId}/${file.name}`,
        });
    }
    return uploadedAttachments;
  };


  const addOrder = async (orderData: Omit<Order, 'id'| 'creationDate' >, newFiles: File[]) => {
    setLoading(true);
    const orderId = `order-${Date.now()}`;
    
    try {
        const newAttachments = await handleFileUploads(orderId, newFiles);
        
        const finalOrderData: Order = {
            ...orderData,
            id: orderId,
            creationDate: new Date().toISOString(),
            attachments: [...(orderData.attachments || []), ...newAttachments]
        };

        setOrders(prev => [...prev, finalOrderData]);
        await addOrderToCustomer(orderData.customerId, orderId);
        
        setLoading(false);
        return orderId;
    } catch(error) {
        console.error("Error creating order:", error);
        setLoading(false);
        throw error;
    }
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    setLoading(true);
    try {
        const newAttachments = await handleFileUploads(updatedOrderData.id, newFiles);
        const finalAttachments = [...(updatedOrderData.attachments || []), ...newAttachments];
        
        const finalOrderData = {
            ...updatedOrderData,
            attachments: finalAttachments
        };

        setOrders(prev => prev.map(o => o.id === updatedOrderData.id ? finalOrderData : o));
        setLoading(false);
    } catch(error) {
         console.error("Error updating order:", error);
         setLoading(false);
         throw error;
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    setLoading(true);
    setOrders(prev => prev.filter(o => o.id !== orderId));
    // In a real app, you would also delete from customer's orderIds array
    setLoading(false);
  };
  
  const getOrderById = useCallback((orderId: string) => {
    return orders?.find(order => order.id === orderId);
  }, [orders]);
  
  const value = useMemo(() => ({
      orders: orders || [],
      loading,
      addOrder,
      updateOrder,
      deleteOrder,
      getOrderById,
      uploadProgress,
  }), [orders, loading, uploadProgress, getOrderById]);

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
