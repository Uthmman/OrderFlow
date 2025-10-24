
"use client";

import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { v4 as uuidv4 } from 'uuid';
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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useUser();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    // Simulate fetching data
    setOrders(MOCK_ORDERS);
    setLoading(false);
  }, []);

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    if (!user) {
      console.error("User not available");
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an order.' });
      return;
    }

    const orderId = uuidv4();
    
    // Simulate file uploads
    const newAttachments: OrderAttachment[] = newFiles.map(file => ({
      fileName: file.name,
      url: URL.createObjectURL(file), // Create a temporary local URL
      storagePath: `mock/orders/${orderId}/${file.name}`
    }));

    const newOrder: Order = {
      ...orderData,
      id: orderId,
      creationDate: new Date().toISOString(),
      ownerId: user.id,
      attachments: [...(orderData.attachments || []), ...newAttachments],
    };

    setOrders(prevOrders => [newOrder, ...prevOrders]);
    return orderId;
  };

  const updateOrder = async (updatedOrder: Order, newFiles: File[] = []) => {
    if (!user) {
      console.error("User not available");
      return;
    }

    const originalOrder = orders.find(o => o.id === updatedOrder.id);

    // Simulate file uploads for new files
    const newAttachments: OrderAttachment[] = newFiles.map(file => ({
      fileName: file.name,
      url: URL.createObjectURL(file),
      storagePath: `mock/orders/${updatedOrder.id}/${file.name}`
    }));
    
    const finalAttachments = [...(updatedOrder.attachments || []), ...newAttachments];

    const newChatMessages: OrderChatMessage[] = updatedOrder.chatMessages ? [...updatedOrder.chatMessages] : [];
    if (originalOrder && originalOrder.status !== updatedOrder.status) {
        newChatMessages.push({
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${user.name} changed status from '${originalOrder.status}' to '${updatedOrder.status}'`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
        });
    }

    const finalOrder = { 
        ...updatedOrder, 
        attachments: finalAttachments,
        chatMessages: newChatMessages
    };

    setOrders(prevOrders => prevOrders.map(o => (o.id === updatedOrder.id ? finalOrder : o)));
  };

  const deleteOrder = async (orderId: string) => {
    setOrders(prevOrders => prevOrders.filter(o => o.id !== orderId));
  };

  const getOrderById = (orderId: string) => {
    return orders.find(order => order.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders: orders || [], loading, addOrder, updateOrder, deleteOrder, getOrderById, uploadProgress }}>
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
