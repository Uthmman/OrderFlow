
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import type { Order, OrderAttachment, OrderChatMessage } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser } from './use-user';
import { createNotification } from '@/lib/notifications';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[]) => Promise<string | undefined>;
  updateOrder: (order: Order, newFiles?: File[]) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useUser();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemoFirebase(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersRef);

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    if (!files || files.length === 0) return [];
    
    const storage = getStorage(firebaseApp);

    try {
      const uploadPromises = files.map(async (file) => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        const storagePath = `orders/${orderId}/${file.name}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

        const downloadURL = await getDownloadURL(storageRef);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        return {
          fileName: file.name,
          url: downloadURL,
          storagePath: storagePath,
        };
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
      console.error("Upload failed:", error);
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Could not upload files to Firebase Storage.",
      });
      throw error;
    } finally {
        setUploadProgress({});
    }
  };


  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[]) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    const newOrderRef = doc(collection(firestore, "orders"));
    const orderId = newOrderRef.id;
    
    try {
      const newAttachments = await handleFileUploads(orderId, newFiles);
      
      const finalOrderData: Order = {
          ...orderData,
          id: orderId,
          creationDate: serverTimestamp(),
          attachments: [...(orderData.attachments || []), ...newAttachments],
          ownerId: user.id
      };

      setDocumentNonBlocking(newOrderRef, finalOrderData, {});
      await addOrderToCustomer(orderData.customerId, orderId);
      
      return orderId;
    } catch(error) {
      console.error("Error creating order:", error);
      throw error;
    }
  };

  const updateOrder = async (orderData: Order, newFiles: File[] = []) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    try {
      const orderRef = doc(firestore, 'orders', orderData.id);
      const originalOrder = orders?.find(o => o.id === orderData.id);

      let dataForUpdate: Partial<Order> = { ...orderData };

      const newAttachments = await handleFileUploads(orderData.id, newFiles);
      if (newAttachments.length > 0) {
        dataForUpdate.attachments = [...(dataForUpdate.attachments || []), ...newAttachments];
      }

      if (originalOrder) {
        const systemMessages: OrderChatMessage[] = [];
        const timestamp = new Date().toISOString();
        const currentUser = user.name || 'a user';

        const createSystemMessage = (text: string) => ({
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${text} by ${currentUser}.`,
            timestamp,
            isSystemMessage: true
        });

        if (originalOrder.status !== orderData.status) {
            systemMessages.push(createSystemMessage(`Status changed from '${originalOrder.status}' to '${orderData.status}'`));
            createNotification(firestore, user.id, {
                type: `Order ${orderData.status}`,
                message: `Order #${orderData.id.slice(-5)} status was updated to ${orderData.status}.`,
                orderId: orderData.id
            });
        }
        if (originalOrder.isUrgent !== orderData.isUrgent) {
            const urgencyText = orderData.isUrgent ? 'marked as URGENT' : 'urgency removed';
            systemMessages.push(createSystemMessage(`Order ${urgencyText}`));
        }
        
        if (systemMessages.length > 0) {
            const existingChat = orderData.chatMessages || [];
            const updatedChat = [...existingChat, ...systemMessages];
            dataForUpdate.chatMessages = updatedChat;
        }
      }
      
      updateDocumentNonBlocking(orderRef, dataForUpdate);

    } catch (error) {
      console.error("Error updating order:", error);
      throw error;
    }
  };

 const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);

    const storage = getStorage(firebaseApp);
    const deletePromises = (attachments || []).map(att => {
      if (!att.storagePath) return Promise.resolve();
      const fileRef = ref(storage, att.storagePath);
      return deleteObject(fileRef).catch(error => {
        // Log error but don't let it crash the whole operation
        console.error(`Failed to delete attachment ${att.storagePath}:`, error);
      });
    });

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("One or more files could not be deleted from Firebase Storage.", error);
    }
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
