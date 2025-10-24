
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, deleteDoc, Timestamp, getFirestore, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { useCollection } from '@/firebase/firestore/use-collection';
import { initializeFirebase } from '@/firebase';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';

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
  const { firestore } = initializeFirebase();
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemo(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, loading } = useCollection<Order>(ordersRef);

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    if (!files || files.length === 0) return [];
    
    const { firebaseApp } = initializeFirebase();
    const storage = getStorage(firebaseApp);
    const uploadedAttachments: OrderAttachment[] = [];

    for (const file of files) {
      const storagePath = `orders/${orderId}/${file.name}`;
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload failed for file:", file.name, error);
            toast({
                variant: 'destructive',
                title: 'File Upload Failed',
                description: `Could not upload ${file.name}.`,
            });
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            uploadedAttachments.push({
              fileName: file.name,
              url: downloadURL,
              storagePath: storagePath,
            });
            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[file.name];
                return newProgress;
            });
            resolve();
          }
        );
      });
    }

    return uploadedAttachments;
  };


  const addOrder = async (orderData: Omit<Order, 'id'| 'creationDate' >, newFiles: File[]) => {
    const newOrderRef = doc(collection(firestore, 'orders'));
    const orderId = newOrderRef.id;

    try {
        const newAttachments = await handleFileUploads(orderId, newFiles);
        
        const finalOrderData = {
            ...orderData,
            id: orderId,
            creationDate: Timestamp.now(),
            attachments: [...(orderData.attachments || []), ...newAttachments]
        };

        await addDoc(ordersRef, finalOrderData);
        await addOrderToCustomer(orderData.customerId, orderId);

        return orderId;
    } catch(error) {
        console.error("Error creating order:", error);
        throw error;
    }
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    const orderRef = doc(firestore, 'orders', updatedOrderData.id);
    try {
        const newAttachments = await handleFileUploads(updatedOrderData.id, newFiles);
        const finalAttachments = [...(updatedOrderData.attachments || []), ...newAttachments];
        await updateDoc(orderRef, {
            ...updatedOrderData,
            attachments: finalAttachments
        });
    } catch(error) {
         console.error("Error updating order:", error);
         throw error;
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    await deleteDoc(orderRef);

    if (attachments && attachments.length > 0) {
      const { firebaseApp } = initializeFirebase();
      const storage = getStorage(firebaseApp);
      for(const att of attachments) {
        const fileRef = ref(storage, att.storagePath);
        try {
          await deleteObject(fileRef);
        } catch (error) {
          console.error("Error deleting attachment from storage:", error);
          toast({
            variant: "destructive",
            title: "Attachment Deletion Failed",
            description: `Could not delete ${att.fileName}. It might have already been removed.`
          })
        }
      }
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
