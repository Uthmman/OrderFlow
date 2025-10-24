
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
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  const ordersCollectionRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return collection(firestore, 'orders');
  }, [firestore]);
  
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersCollectionRef);

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    const storage = getStorage();
    const attachmentPromises = files.map(file => {
      const storageRef = ref(storage, `orders/${orderId}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      return new Promise<OrderAttachment>((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
          },
          (error) => {
            console.error("Upload failed:", error);
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            setUploadProgress(prev => {
              const newState = { ...prev };
              delete newState[file.name];
              return newState;
            });
            resolve({
              fileName: file.name,
              url: downloadURL,
              storagePath: uploadTask.snapshot.ref.fullPath,
            });
          }
        );
      });
    });

    return Promise.all(attachmentPromises);
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to create an order.' });
      return;
    }

    const orderRef = doc(collection(firestore, 'orders'));
    const orderId = orderRef.id;

    try {
      const newAttachments = await handleFileUploads(orderId, newFiles);
      
      const newOrder: Omit<Order, 'id'> = {
        ...orderData,
        creationDate: serverTimestamp(),
        ownerId: user.id,
        attachments: [...(orderData.attachments || []), ...newAttachments],
      };
      
      addDocumentNonBlocking(collection(firestore, 'orders'), newOrder);
      return orderId;

    } catch (error) {
       console.error("Error creating order or uploading files: ", error);
       toast({ variant: 'destructive', title: 'Upload Error', description: 'Failed to upload attachments.' });
    }
  };

  const updateOrder = async (updatedOrderData: Order, newFiles: File[] = []) => {
    if (!user || !firestore) {
      console.error("User or Firestore not available");
      return;
    }

    const orderRef = doc(firestore, 'orders', updatedOrderData.id);
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

        updateDocumentNonBlocking(orderRef, finalOrderData);

    } catch (error) {
        console.error("Error updating order or uploading files: ", error);
        toast({ variant: 'destructive', title: 'Update Error', description: 'Failed to update order.' });
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
     if (!firestore) return;
     const orderRef = doc(firestore, 'orders', orderId);
     deleteDocumentNonBlocking(orderRef);
     
     // Delete associated files from storage
     const storage = getStorage();
     attachments.forEach(att => {
        const fileRef = ref(storage, att.storagePath);
        deleteObject(fileRef).catch(error => {
            console.error(`Failed to delete attachment ${att.fileName}:`, error);
        });
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
