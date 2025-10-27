
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
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

// Helper function to remove undefined properties from an object
const removeUndefined = (obj: any) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore, firebaseApp } = useFirebase();
  const { user } = useUser();
  const storage = getStorage(firebaseApp);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemoFirebase(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersRef);

  const handleFileUploads = (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    if (!files || files.length === 0) return Promise.resolve([]);

    const uploadPromises = files.map(file => {
      const storagePath = `orders/${orderId}/${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<OrderAttachment>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload failed:", error);
            toast({ variant: "destructive", title: "Upload Failed", description: `Could not upload ${file.name}.` });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(prev => {
              const newProgress = { ...prev };
              delete newProgress[file.name];
              return newProgress;
            });
            resolve({ fileName: file.name, url: downloadURL, storagePath });
          }
        );
      });
    });

    return Promise.all(uploadPromises);
  };


  const addOrder = async (orderData: Omit<Order, 'id'| 'creationDate' | 'ownerId'>, newFiles: File[]) => {
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

        setDocumentNonBlocking(newOrderRef, removeUndefined(finalOrderData), {});
        await addOrderToCustomer(orderData.customerId, orderId);
        
        return orderId;
    } catch(error) {
        console.error("Error creating order:", error);
        throw error;
    }
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    const originalOrder = getOrderById(updatedOrderData.id);
    if (!originalOrder) {
        console.error("Original order not found for update.");
        const orderRef = doc(firestore, 'orders', updatedOrderData.id);
        updateDocumentNonBlocking(orderRef, removeUndefined(updatedOrderData));
        return;
    }

    const systemMessages: OrderChatMessage[] = [];
    const timestamp = new Date().toISOString();

    const createSystemMessage = (text: string) => ({
      user: { id: 'system', name: 'System', avatarUrl: '' },
      text: `${text} by ${user.name || 'a user'}.`,
      timestamp,
      isSystemMessage: true
    });

    if (originalOrder.status !== updatedOrderData.status) {
      systemMessages.push(createSystemMessage(`Status changed from '${originalOrder.status}' to '${updatedOrderData.status}'`));
      createNotification(firestore, user.id, {
        type: `Order ${updatedOrderData.status}`,
        message: `Order #${updatedOrderData.id.slice(-5)} status was updated to ${updatedOrderData.status}.`,
        orderId: updatedOrderData.id
      });
    }

    if (originalOrder.isUrgent !== updatedOrderData.isUrgent) {
      const urgencyText = updatedOrderData.isUrgent ? 'marked as URGENT' : 'urgency removed';
      systemMessages.push(createSystemMessage(`Order ${urgencyText}`));
       createNotification(firestore, user.id, {
        type: `Order Urgency Changed`,
        message: `Urgency for order #${updatedOrderData.id.slice(-5)} was ${updatedOrderData.isUrgent ? 'added' : 'removed'}.`,
        orderId: updatedOrderData.id
      });
    }

    try {
        const newAttachments = await handleFileUploads(updatedOrderData.id, newFiles);
        
        const finalOrderData: Order = { ...updatedOrderData };
        
        if (newAttachments.length > 0) {
            finalOrderData.attachments = [...(updatedOrderData.attachments || []), ...newAttachments];
        }

        if (systemMessages.length > 0) {
            finalOrderData.chatMessages = [...(updatedOrderData.chatMessages || []), ...systemMessages];
        }

        const orderRef = doc(firestore, 'orders', updatedOrderData.id);
        updateDocumentNonBlocking(orderRef, removeUndefined(finalOrderData));

    } catch(error) {
         console.error("Error updating order:", error);
         throw error;
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);
    
    const deletePromises = (attachments || []).map(att => {
        if (!att.storagePath) return Promise.resolve();
        const fileRef = ref(storage, att.storagePath);
        return deleteObject(fileRef).catch(error => {
            if (error.code !== 'storage/object-not-found') {
                console.error(`Failed to delete attachment ${att.storagePath}:`, error);
            }
        });
    });
    await Promise.all(deletePromises);
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
