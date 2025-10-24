
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
    useMemoFirebase,
} from '@/firebase';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";

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
  
  const ordersCollection = useMemoFirebase(() => {
    if (firestore) {
        return collection(firestore, 'orders');
    }
    return null;
  }, [firestore]);

  const { data: orders, isLoading: loading } = useCollection<Order>(ordersCollection);

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
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an order.' });
      return;
    }
    
    // We need a temporary ID for file uploads before the doc exists
    const tempId = doc(collection(firestore, 'orders')).id;
    const newAttachments = await handleFileUploads(tempId, newFiles);
    
    const newOrder = {
      ...orderData,
      creationDate: serverTimestamp(),
      ownerId: user.id,
      attachments: [...(orderData.attachments || []), ...newAttachments],
    };

    const docRef = doc(firestore, 'orders', tempId);
    await addDocumentNonBlocking(collection(firestore, 'orders'), newOrder);

    return tempId;
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    if (!user || !firestore) {
      console.error("User or firestore not available");
      return;
    }

    const originalOrder = orders?.find(o => o.id === updatedOrderData.id);
    const orderRef = doc(firestore, "orders", updatedOrderData.id);

    try {
        const newAttachments = await handleFileUploads(updatedOrderData.id, newFiles);
        const finalAttachments = [...(updatedOrderData.attachments || []), ...newAttachments];
        
        const newChatMessages: OrderChatMessage[] = updatedOrderData.chatMessages ? [...updatedOrderData.chatMessages] : [];
        if (originalOrder && originalOrder.status !== updatedOrderData.status) {
            newChatMessages.push({
                user: { id: 'system', name: 'System', avatarUrl: '' },
                text: `${user.name} changed status from '${originalOrder.status}' to '${updatedOrderData.status}'`,
                timestamp: serverTimestamp(),
                isSystemMessage: true,
            });
        }
        
        const finalOrderData = {
            ...updatedOrderData,
            attachments: finalAttachments,
            chatMessages: newChatMessages
        };

        updateDocumentNonBlocking(orderRef, finalOrderData);

    } catch (error) {
        console.error("Error updating order: ", error);
        toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update order.' });
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    if (!firestore) return;

    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);
    
    const storage = getStorage();
    attachments.forEach(att => {
        if (att.storagePath) {
            const fileRef = ref(storage, att.storagePath);
            deleteObject(fileRef).catch(error => {
                console.error("Failed to delete attachment: ", error);
            });
        }
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
