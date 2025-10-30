
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { Order, OrderAttachment, OrderChatMessage } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useUser } from './use-user';
import { triggerNotification } from '@/lib/notifications';
import { uploadFileFlow, deleteFileFlow } from '@/ai/flows/backblaze-flow';


interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[]) => Promise<string | undefined>;
  updateOrder: (order: Order, newFiles?: File[], filesToDelete?: OrderAttachment[], chatMessage?: { text: string; fileType?: 'audio' | 'image' | 'file' }) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Helper function to remove undefined values from an object
const removeUndefined = (obj: any) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        if (obj[key] !== undefined) {
            newObj[key] = obj[key];
        }
    });
    return newObj;
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemoFirebase(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersRef);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URI prefix e.g., "data:image/jpeg;base64,"
        const base64 = result.split(',')[1];
        if (base64) {
          resolve(base64);
        } else {
          reject(new Error("Failed to read file as base64."));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileUploads = async (files: File[]): Promise<OrderAttachment[]> => {
    if (!files || files.length === 0) return [];

    setUploadProgress(
      files.reduce((acc, file) => ({ ...acc, [file.name]: 0 }), {})
    );

    try {
      const uploadPromises = files.map(async (file) => {
        const fileContent = await fileToBase64(file);
        setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));
        
        const result = await uploadFileFlow({
          fileContent,
          contentType: file.type,
        });

        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        
        return {
          fileName: file.name, // Use original file name for display
          url: result.url,
          storagePath: result.fileName, // Use unique file name for storage path
        };
      });

      const results = await Promise.all(uploadPromises);
      return results;
    } catch (error) {
        console.error("Upload failed:", error);
        toast({
            variant: "destructive",
            title: "Upload Failed",
            description: (error as Error).message || "Could not upload files. Please ensure file storage is configured correctly on the server.",
        });
        throw error; // Re-throw to be caught by the calling function
    } finally {
      setUploadProgress({});
    }
  };


  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[]) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    const newOrderRef = doc(collection(firestore, "orders"));
    const orderId = newOrderRef.id;
    
    try {
      const newAttachments = await handleFileUploads(newFiles);
      
      const finalOrderData: Order = {
          ...orderData,
          id: orderId,
          creationDate: serverTimestamp(),
          attachments: [...(orderData.attachments || []), ...newAttachments],
          ownerId: user.id
      };
      
      const cleanData = removeUndefined(finalOrderData);

      setDocumentNonBlocking(newOrderRef, cleanData, {});
      await addOrderToCustomer(orderData.customerId, orderId);

      // Trigger notification for order creation
      triggerNotification(firestore, user.id, {
        type: 'New Order Created',
        message: `You created a new order: #${orderId.slice(-5)}.`,
        orderId: orderId
      });
      
      return orderId;
    } catch(error) {
      console.error("Error creating order:", error);
      // The toast is already shown in handleFileUploads, no need to show another one here.
      // Re-throwing to ensure the form's isSubmitting state is handled correctly.
      throw error;
    }
  };

  const updateOrder = async (orderData: Order, newFiles: File[] = [], filesToDelete: OrderAttachment[] = [], chatMessage?: { text: string; fileType?: 'audio' | 'image' | 'file' }) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    try {
      const orderRef = doc(firestore, 'orders', orderData.id);
      const originalOrder = orders?.find(o => o.id === orderData.id);

      let dataForUpdate: Partial<Order> = { ...orderData };
      let newAttachmentsForChat: OrderAttachment[] = [];

      // Handle file deletions from main attachments
      if (filesToDelete.length > 0) {
        const deletePromises = filesToDelete.map(att => deleteFileFlow({ fileName: att.storagePath }));
        await Promise.all(deletePromises);
      }
      
      // Handle file uploads
      if (newFiles.length > 0) {
          const uploadedFiles = await handleFileUploads(newFiles);
          // If the upload is NOT for a chat message, add it to general attachments
          if (!chatMessage) {
            dataForUpdate.attachments = [...(dataForUpdate.attachments || []), ...uploadedFiles];
          } else {
            // If it's for a chat message, keep it separate
            newAttachmentsForChat = uploadedFiles;
          }
      }
      

      // Handle new chat message
      const systemMessages: OrderChatMessage[] = [];
      const timestamp = new Date().toISOString();
      const currentUser = {
          id: user.id,
          name: user.name || 'User',
          avatarUrl: user.avatarUrl || '',
      };
      
      if (chatMessage && (chatMessage.text || newAttachmentsForChat.length > 0)) {
        const newChatMessage: OrderChatMessage = {
            user: currentUser,
            text: chatMessage.text,
            timestamp,
        };
        // If a file was uploaded specifically for this chat, attach it to the message
        if (newAttachmentsForChat.length === 1 && chatMessage.fileType) {
            newChatMessage.attachment = newAttachmentsForChat[0];
        }
        systemMessages.push(newChatMessage);
        
        // Notify about the new message
        triggerNotification(firestore, user.id, {
            type: 'New Chat Message',
            message: `${currentUser.name} sent a message in order #${orderData.id.slice(-5)}`,
            orderId: orderData.id,
        });
      }
      

      if (originalOrder) {
        const createSystemMessage = (text: string) => ({
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${text} by ${currentUser.name}.`,
            timestamp,
            isSystemMessage: true
        });

        if (originalOrder.status !== orderData.status) {
            const messageText = `Status changed from '${originalOrder.status}' to '${orderData.status}'`;
            systemMessages.push(createSystemMessage(messageText));
            triggerNotification(firestore, user.id, {
                type: `Order ${orderData.status}`,
                message: `Order #${orderData.id.slice(-5)} status was updated to ${orderData.status}.`,
                orderId: orderData.id
            });
        }
        if (originalOrder.isUrgent !== orderData.isUrgent) {
            const urgencyText = orderData.isUrgent ? 'marked as URGENT' : 'urgency removed';
            systemMessages.push(createSystemMessage(`Order ${urgencyText}`));
             triggerNotification(firestore, user.id, {
                type: `Order Urgency Changed`,
                message: `Order #${orderData.id.slice(-5)} was ${urgencyText}.`,
                orderId: orderData.id,
             });
        }
      }

      if (systemMessages.length > 0) {
        const existingChat = dataForUpdate.chatMessages || [];
        dataForUpdate.chatMessages = [...existingChat, ...systemMessages];
      }
      
      const cleanData = removeUndefined(dataForUpdate);
      updateDocumentNonBlocking(orderRef, cleanData);

    } catch (error) {
      console.error("Error updating order:", error);
      // Toast is handled in handleFileUploads
      throw error;
    }
  };

 const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);

    const deletePromises = (attachments || []).map(att => {
      if (!att.storagePath) return Promise.resolve();
      // storagePath now holds the fileName in B2
      return deleteFileFlow({ fileName: att.storagePath }).catch(error => {
        console.error(`Failed to delete attachment ${att.storagePath}:`, error);
      });
    });

    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("One or more files could not be deleted from Backblaze B2.", error);
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
