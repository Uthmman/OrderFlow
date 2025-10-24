
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo } from 'react';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useUser } from '@/firebase/auth/use-user';
import { 
    useFirestore, 
    addDocumentNonBlocking, 
    updateDocumentNonBlocking, 
    deleteDocumentNonBlocking, 
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const loading = false;

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    const storage = getStorage();
    const uploadedAttachments: OrderAttachment[] = [];

    const uploadPromises = files.map(file => {
      return new Promise<OrderAttachment>((resolve, reject) => {
        const storagePath = `orders/${orderId}/${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload failed for ", file.name, error);
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: `Could not upload ${file.name}.`
            })
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            const attachment = { fileName: file.name, url: downloadURL, storagePath };
            uploadedAttachments.push(attachment);
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
            });
            resolve(attachment);
          }
        );
      });
    });

    await Promise.all(uploadPromises);
    return uploadedAttachments;
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an order.' });
      return;
    }
    
    const newId = `order-${Date.now()}`;
    const newAttachments = await handleFileUploads(newId, newFiles);
    
    const newOrder: Order = {
      id: newId,
      ...orderData,
      creationDate: new Date().toISOString(),
      ownerId: user.id,
      attachments: [...(orderData.attachments || []), ...newAttachments],
    };

    setOrders(prev => [newOrder, ...prev]);
    return newId;
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
        console.error("Error updating order: ", error);
        toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update order.' });
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    
    const storage = getStorage();
    attachments.forEach(att => {
        const fileRef = ref(storage, att.storagePath);
        deleteObject(fileRef).catch(error => {
            console.error("Failed to delete attachment: ", error);
            // Non-critical, so maybe don't toast
        });
    })
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
