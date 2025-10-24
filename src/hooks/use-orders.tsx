
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { 
    useFirestore, 
    useCollection, 
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
    useMemoFirebase
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
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
  const { user } = useUser();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // MOCK DATA IMPLEMENTATION
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const loading = false;

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    // This is a mock implementation and will not actually upload files.
    console.warn("File upload is mocked. Files are not saved.");
    toast({
        title: "Mock Upload",
        description: "File uploads are disabled in this demo."
    })
    return files.map(file => ({
        fileName: file.name,
        url: `https://picsum.photos/seed/${file.name}/200/150`,
        storagePath: `mock/orders/${orderId}/${file.name}`
    }));
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an order.' });
      return;
    }
    const orderId = `mock-order-${Math.random().toString(36).substring(2, 9)}`;
    
    try {
      const newAttachments = await handleFileUploads(orderId, newFiles);
      
      const newOrder: Order = {
        id: orderId,
        ...orderData,
        creationDate: new Date().toISOString(),
        ownerId: user.id,
        attachments: [...(orderData.attachments || []), ...newAttachments],
      };
      
      setOrders(prev => [newOrder, ...prev]);
      return orderId;

    } catch (error) {
       console.error("Error creating mock order: ", error);
       toast({ variant: 'destructive', title: 'Mock Error', description: 'Failed to create mock order.' });
    }
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    if (!user) {
      console.error("User not available");
      return;
    }

    const originalOrder = orders?.find(o => o.id === updatedOrderData.id);

    try {
        const newAttachments = await handleFileUploads(updatedOrderData.id, newFiles);
        const finalAttachments = [...(updatedOrderData.attachments || []), ...newAttachments];
        const newChatMessages: OrderChatMessage[] = updatedOrderData.chatMessages ? [...updatedOrderData.chatMessages] : [];
        
        if (originalOrder && originalOrder.status !== updatedOrderData.status) {
            newChatMessages.push({
                user: { id: 'system', name: 'System', avatarUrl: '' },
                text: `${user.name} changed status from '${originalOrder.status}' to '${updatedOrderData.status}'`,
                timestamp: new Date().toISOString(),
                isSystemMessage: true,
            });
        }
        
        const finalOrderData = {
            ...updatedOrderData,
            attachments: finalAttachments,
            chatMessages: newChatMessages
        };

        setOrders(prev => prev.map(o => o.id === finalOrderData.id ? finalOrderData : o));

    } catch (error) {
        console.error("Error updating mock order: ", error);
        toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update mock order.' });
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
     setOrders(prev => prev.filter(o => o.id !== orderId));
     console.warn(`Mock delete for order ${orderId}. Associated files not actually deleted.`);
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
