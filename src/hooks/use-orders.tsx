

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
import { v4 as uuidv4 } from 'uuid';


interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[], isDraft?: boolean) => Promise<string | undefined>;
  updateOrder: (order: Order, newFiles?: File[], filesToDelete?: OrderAttachment[], chatMessage?: { text: string; fileType?: 'audio' | 'image' | 'file' }, isDraft?: boolean) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Helper function to remove undefined values from an object
const removeUndefined = (obj: any) => {
    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
            newObj[key] = value;
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


  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate' | 'ownerId'>, newFiles: File[], isDraft = false) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    // Check if we are updating an existing draft stored in localStorage
    const draftId = localStorage.getItem('orderDraftId');
    if (draftId) {
        // If there's a draftId, we're updating an existing draft.
        // The orderData from the form might not have an ID, so we use the draftId.
        const orderToUpdate = { ...orderData, id: draftId } as Order;
        // The rest of the logic is handled by updateOrder.
        await updateOrder(orderToUpdate, newFiles, [], undefined, isDraft);
        return draftId;
    }
    
    // This is a brand new order.
    const newOrderRef = doc(collection(firestore, "orders"));
    const orderId = newOrderRef.id;
    
    const finalOrderData: Order = {
        ...orderData,
        id: orderId,
        creationDate: serverTimestamp(),
        attachments: orderData.attachments || [],
        ownerId: user.id,
        status: isDraft ? 'Draft' : orderData.status,
    };
    
    const cleanData = removeUndefined(finalOrderData);
    setDocumentNonBlocking(newOrderRef, cleanData, {});

    if (isDraft) {
      localStorage.setItem('orderDraftId', orderId);
    } else {
      await addOrderToCustomer(orderData.customerId, orderId);
      triggerNotification(firestore, [user.id], {
        type: 'New Order Created',
        message: `You created a new order: #${orderId.slice(-5)}.`,
        orderId: orderId
      });
      localStorage.removeItem('orderDraftId');
    }

    // Handle file uploads in the background
    if (newFiles.length > 0) {
      handleFileUploads(newFiles).then(newAttachments => {
        const orderRef = doc(firestore, 'orders', orderId);
        const currentAttachments = finalOrderData.attachments || [];
        updateDocumentNonBlocking(orderRef, { attachments: [...currentAttachments, ...newAttachments] });
      }).catch(error => {
        console.error("Background upload failed:", error);
      });
    }
    
    return orderId;
  };

  const updateOrder = async (orderData: Order, newFiles: File[] = [], filesToDelete: OrderAttachment[] = [], chatMessage?: { text: string; fileType?: 'audio' | 'image' | 'file' }, isDraft = false) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    const orderRef = doc(firestore, 'orders', orderData.id);
    const originalOrder = orders?.find(o => o.id === orderData.id);

    // Immediately update text-based data
    let dataForUpdate: Partial<Order> = { ...orderData };
    
    // Handle file deletions immediately
    if (filesToDelete.length > 0) {
        const deletePromises = filesToDelete.map(att => deleteFileFlow({ fileName: att.storagePath }));
        Promise.all(deletePromises).catch(err => console.error("Failed to delete some files from B2", err));
    }
    
    const usersToNotify = Array.from(new Set([
      ...(orderData.assignedTo || []),
      orderData.ownerId,
    ])).filter(id => id !== user.id); 
    
    const systemMessages: OrderChatMessage[] = [];
    let newChatMessage: OrderChatMessage | null = null;
    const timestamp = new Date().toISOString();
    const currentUser = {
        id: user.id,
        name: user.name || 'User',
        avatarUrl: user.avatarUrl || '',
    };
    
    // --- Message Handling ---
    if (chatMessage && (chatMessage.text.trim() || newFiles.length > 0)) {
        newChatMessage = {
            id: uuidv4(),
            user: currentUser,
            text: chatMessage.text,
            timestamp,
        };
        // Don't add attachment here yet
    }
    
    if (originalOrder) {
        const createSystemMessage = (text: string) => ({
            id: uuidv4(),
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${text} by ${currentUser.name}.`,
            timestamp,
            isSystemMessage: true
        });

        if (originalOrder.status === 'Draft' && orderData.status !== 'Draft' && !isDraft) {
            await addOrderToCustomer(orderData.customerId, orderData.id);
            systemMessages.push(createSystemMessage(`Order submitted from Draft status`));
            localStorage.removeItem('orderDraftId');
            if (usersToNotify.length > 0) {
                triggerNotification(firestore, usersToNotify, { type: `New Order Submitted`, message: `Order #${orderData.id.slice(-5)} was submitted from a draft.`, orderId: orderData.id });
            }
        }

        if (originalOrder.status !== orderData.status) {
            systemMessages.push(createSystemMessage(`Status changed from '${originalOrder.status}' to '${orderData.status}'`));
            if (usersToNotify.length > 0) {
                triggerNotification(firestore, usersToNotify, { type: `Order ${orderData.status}`, message: `Order #${orderData.id.slice(-5)} status was updated to ${orderData.status}.`, orderId: orderData.id });
            }
        }
        if (originalOrder.isUrgent !== orderData.isUrgent) {
            const urgencyText = orderData.isUrgent ? 'marked as URGENT' : 'urgency removed';
            systemMessages.push(createSystemMessage(`Order ${urgencyText}`));
            if (usersToNotify.length > 0) {
                triggerNotification(firestore, usersToNotify, { type: `Order Urgency Changed`, message: `Order #${orderData.id.slice(-5)} was ${urgencyText}.`, orderId: orderData.id });
            }
        }
    }
    
    const allNewMessages = [...systemMessages];
    if (newChatMessage) {
      allNewMessages.push(newChatMessage);
    }
    
    let chatMessagesToUpdate = dataForUpdate.chatMessages || [];
    if (allNewMessages.length > 0) {
      chatMessagesToUpdate = [...chatMessagesToUpdate, ...allNewMessages];
      dataForUpdate.chatMessages = chatMessagesToUpdate;
    }
    
    // If it's just a file without text for a chat, we need a placeholder message to update later
    if(newFiles.length > 0 && chatMessage && !chatMessage.text.trim()) {
        if (!newChatMessage) {
            newChatMessage = { id: uuidv4(), user: currentUser, text: '', timestamp };
            dataForUpdate.chatMessages = [...chatMessagesToUpdate, newChatMessage];
        }
    }

    const cleanData = removeUndefined(dataForUpdate);
    updateDocumentNonBlocking(orderRef, cleanData);

    // --- Background File Uploads ---
    if (newFiles.length > 0) {
        handleFileUploads(newFiles).then(uploadedFiles => {
            const currentOrder = orders?.find(o => o.id === orderData.id);
            if (!currentOrder) return;

            // If it was a chat attachment, find the message and update it
            if (chatMessage && newChatMessage) {
                const messageId = newChatMessage.id;
                const updatedMessages = currentOrder.chatMessages?.map(msg => {
                    if (msg.id === messageId) {
                        return { ...msg, attachment: uploadedFiles[0] };
                    }
                    return msg;
                }) || [];
                updateDocumentNonBlocking(orderRef, { chatMessages: updatedMessages });

                if (usersToNotify.length > 0) {
                   triggerNotification(firestore, usersToNotify, {
                        type: 'New File in Chat',
                        message: `${currentUser.name} added a file to order #${orderData.id.slice(-5)}`,
                        orderId: orderData.id,
                    });
                }

            } else { // It was a general order attachment
                const currentAttachments = currentOrder.attachments || [];
                updateDocumentNonBlocking(orderRef, { attachments: [...currentAttachments, ...uploadedFiles] });
            }
        }).catch(error => {
            console.error("Background upload failed:", error);
        });
    }

    if (!isDraft) {
        localStorage.removeItem('orderDraftId');
    }
  };

 const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    deleteDocumentNonBlocking(orderRef);

    const deletePromises = (attachments || []).map(att => {
      if (!att.storagePath) return Promise.resolve();
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
