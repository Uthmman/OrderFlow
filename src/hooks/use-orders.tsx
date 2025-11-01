

"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
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
import { compressImage } from '@/lib/utils';
import { audioToWavFlow } from '@/ai/flows/audio-flow';


interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate' | 'ownerId'>) => Promise<string | undefined>;
  updateOrder: (order: Order, chatMessage?: { text: string; file?: File; }) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
  addAttachment: (orderId: string, file: File) => Promise<void>;
  removeAttachment: (orderId: string, attachment: OrderAttachment) => Promise<void>;
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

  const handleFileUpload = async (file: File): Promise<OrderAttachment> => {
    const fileName = file.name;
    setUploadProgress(prev => ({ ...prev, [fileName]: 0 }));

    try {
        let fileContent;
        let contentType = file.type;

        if (file.type.startsWith('image/')) {
            const compressedFile = await compressImage(file);
            fileContent = await fileToBase64(compressedFile);
            contentType = compressedFile.type;
        } else {
            fileContent = await fileToBase64(file);
        }

        setUploadProgress(prev => ({ ...prev, [fileName]: 50 }));
        
        const result = await uploadFileFlow({
          fileContent,
          contentType: contentType,
        });

        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        
        return {
          fileName: file.name,
          url: result.url,
          storagePath: result.fileName,
        };
    } catch (error) {
        console.error(`Upload failed for ${fileName}:`, error);
         setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
        toast({
            variant: "destructive",
            title: `Upload Failed: ${fileName}`,
            description: (error as Error).message || "Could not upload file.",
        });
        throw error;
    } finally {
       // Hide progress bar after a short delay
       setTimeout(() => {
         setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
       }, 2000);
    }
  };
  
  const addAttachment = async (orderId: string, file: File) => {
      try {
        const newAttachment = await handleFileUpload(file);
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        const currentAttachments = currentOrder?.attachments || [];
        await updateDoc(orderRef, { attachments: [...currentAttachments, newAttachment] });
      } catch (error) {
          // Error is already handled by handleFileUpload
      }
  };

  const removeAttachment = async (orderId: string, attachment: OrderAttachment) => {
      try {
        await deleteFileFlow({ fileName: attachment.storagePath });
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        const updatedAttachments = (currentOrder?.attachments || []).filter(
            att => att.storagePath !== attachment.storagePath
        );
        await updateDoc(orderRef, { attachments: updatedAttachments });
         toast({
            title: "Attachment Removed",
            description: `${attachment.fileName} has been deleted.`
        });
      } catch (error) {
           console.error("Failed to remove attachment:", error);
           toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "Could not remove the attachment.",
            });
      }
  }


  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate' | 'ownerId'>) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    const newOrderRef = doc(collection(firestore, "orders"));
    const orderId = newOrderRef.id;
    
    const finalOrderData: Order = {
        ...orderData,
        id: orderId,
        creationDate: serverTimestamp(),
        attachments: orderData.attachments || [],
        ownerId: user.id,
        status: 'Pending',
    };
    
    const cleanData = removeUndefined(finalOrderData);
    await setDoc(newOrderRef, cleanData, {});

    await addOrderToCustomer(orderData.customerId, orderId);
    triggerNotification(firestore, [user.id], {
      type: 'New Order Created',
      message: `You created a new order: #${orderId.slice(-5)}.`,
      orderId: orderId
    });
    
    return orderId;
  };

  const updateOrder = async (orderData: Order, chatMessage?: { text: string; file?: File; }) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    
    const orderRef = doc(firestore, 'orders', orderData.id);
    const originalOrder = orders?.find(o => o.id === orderData.id);

    // Immediately update text-based data
    let dataForUpdate: Partial<Order> = { ...orderData };
    
    const usersToNotify = Array.from(new Set([
      ...(orderData.assignedTo || []),
      orderData.ownerId,
    ])).filter(id => id !== user.id); 
    
    const systemMessages: OrderChatMessage[] = [];
    let newChatMessage: OrderChatMessage | null = null;
    const timestamp = new Date().toISOString();
    const currentUser = {
        id: user.id,
        name: user.displayName || 'User',
        avatarUrl: user.photoURL || '',
    };
    
    // --- Message Handling ---
    if (chatMessage && (chatMessage.text.trim() || chatMessage.file)) {
        newChatMessage = {
            id: uuidv4(),
            user: currentUser,
            text: chatMessage.text,
            timestamp,
        };
        
        if (chatMessage.file) {
            try {
                const uploadedAttachment = await handleFileUpload(chatMessage.file);
                newChatMessage.attachment = uploadedAttachment;
            } catch (error) {
                // handleFileUpload already shows a toast, just re-throw to stop processing
                throw error;
            }
        }
    }
    
    if (originalOrder) {
        const createSystemMessage = (text: string) => ({
            id: uuidv4(),
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${text} by ${currentUser.name}.`,
            timestamp,
            isSystemMessage: true
        });

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
    
    const cleanData = removeUndefined(dataForUpdate);
    await updateDoc(orderRef, cleanData);

    // Handle chat message notifications
     if (newChatMessage && usersToNotify.length > 0) {
       triggerNotification(firestore, usersToNotify, {
            type: 'New Message in Order',
            message: `${currentUser.name} wrote: "${newChatMessage.text}"`,
            orderId: orderData.id,
        });
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
      addAttachment,
      removeAttachment,
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
