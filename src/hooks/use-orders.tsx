
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc, writeBatch, updateDoc } from 'firebase/firestore';
import type { Order, OrderAttachment, OrderChatMessage } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser } from './use-user';
import { createNotification } from '@/lib/notifications';
import { uploadFileFlow, deleteFileFlow } from '@/ai/flows/google-drive-flow';
import { Stream } from 'stream';

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
        // We need to allow serverTimestamp, which is an object, but Firestore will reject plain empty objects.
        // We'll also allow arrays, even if they're empty.
        const value = obj[key];
        if (value !== undefined) {
             newObj[key] = value;
        }
    });
    return newObj;
};

// Helper to convert File to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URI prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemoFirebase(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersRef);

  const handleFileUploads = async (orderId: string, files: File[]): Promise<OrderAttachment[]> => {
    if (!files || files.length === 0) return Promise.resolve([]);

    const uploadPromises = files.map(async (file) => {
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      
      const fileContent = await fileToBase64(file);
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      // The try/catch is now in the calling function (addOrder/updateOrder)
      const result = await uploadFileFlow({
        fileName: file.name,
        fileContent: fileContent,
        mimeType: file.type,
      });
      
      setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

      return { 
        fileName: file.name, 
        url: result.webViewLink, 
        storagePath: result.id, 
      };
    });

    try {
        const results = await Promise.all(uploadPromises);
        return results;
    } catch (error: any) {
        console.error("Upload failed:", error);
        toast({ 
          variant: "destructive", 
          title: "Upload Failed", 
          description: error.message || `Could not complete upload. Please ensure file storage is configured.` 
        });
        throw error; // Re-throw to be caught by the calling function
    } finally {
        setUploadProgress({}); // Clear progress regardless of outcome
    }
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
        // The toast is shown in handleFileUploads, so we just re-throw
        // to stop the function execution and let the caller handle UI state.
        throw error;
    }
  };

  const updateOrder = async (orderData: Order, newFiles: File[] = []) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    const originalOrder = orders?.find(o => o.id === orderData.id);
    const orderRef = doc(firestore, 'orders', orderData.id);

    // This is the object that will be sent to Firestore.
    // We start with the provided orderData.
    let dataForUpdate: Partial<Order> = { ...orderData };

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
            dataForUpdate.chatMessages = [...(dataForUpdate.chatMessages || []), ...systemMessages];
        }
    }

    try {
      // Step 1: Handle file uploads. This might throw an error if not configured.
      const newAttachments = await handleFileUploads(orderData.id, newFiles);
      
      // Step 2: If uploads succeed, add the new attachments to our data object.
      if (newAttachments.length > 0) {
        dataForUpdate.attachments = [...(dataForUpdate.attachments || []), ...newAttachments];
      }

      // Step 3: Perform a single Firestore update with all the accumulated changes.
      updateDocumentNonBlocking(orderRef, removeUndefined(dataForUpdate));

    } catch (error) {
      console.error("Error updating order:", error);
      // Let the caller's .catch() block handle UI state changes (e.g., isSubmitting)
      // The toast is already displayed inside handleFileUploads.
      throw error; 
    }
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);
    
    const deletePromises = (attachments || []).map(att => {
        if (!att.storagePath) return Promise.resolve(); // storagePath is now the Google Drive file ID
        return deleteFileFlow(att.storagePath).catch(error => {
            console.error(`Failed to delete attachment ${att.storagePath} from Google Drive:`, error);
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
  }), [orders, loading, uploadProgress, getOrderById, addOrder, updateOrder, deleteOrder]);

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

    