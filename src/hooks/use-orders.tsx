
"use client";

import React, { createContext, useContext, ReactNode, useState } from 'react';
import type { Order, OrderChatMessage, OrderAttachment } from '@/lib/types';
import { useToast } from './use-toast';
import { useCollection, useFirestore, useUser, useStorage } from '@/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { v4 as uuidv4 } from 'uuid';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => Promise<string>;
  updateOrder: (order: Order, newFiles?: File[]) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { user } = useUser();
  const { data: orders, loading } = useCollection<Order>(firestore ? collection(firestore, 'orders') : null);
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadFile = (orderId: string, file: File): Promise<OrderAttachment> => {
    return new Promise((resolve, reject) => {
        if (!storage) {
            reject("Firebase Storage not available");
            return;
        }

        const fileId = uuidv4();
        const storagePath = `orders/${orderId}/${fileId}-${file.name}`;
        const storageRef = ref(storage, storagePath);
        const uploadTask = uploadBytesResumable(storageRef, file);

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
                    const newProgress = { ...prev };
                    delete newProgress[file.name];
                    return newProgress;
                });
                resolve({
                    fileName: file.name,
                    url: downloadURL,
                    storagePath: storagePath
                });
            }
        );
    });
  };

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    if (!firestore || !user) throw new Error("Firestore or user not available");
    
    // Create a temporary order document to get an ID
    const ordersCollection = collection(firestore, 'orders');
    const newOrderRef = doc(ordersCollection);
    const orderId = newOrderRef.id;

    // Upload files
    const attachmentPromises = newFiles.map(file => uploadFile(orderId, file));
    const newAttachments = await Promise.all(attachmentPromises);

    const finalOrderData = {
        ...orderData,
        id: orderId,
        attachments: [...(orderData.attachments || []), ...newAttachments],
        creationDate: serverTimestamp(),
        ownerId: user.id,
    };
    
    await setDoc(newOrderRef, finalOrderData);
    
    return orderId;
  };

  const updateOrder = async (updatedOrder: Order, newFiles: File[] = []) => {
    if (!firestore || !user || !storage) return;

    const originalOrder = orders?.find(o => o.id === updatedOrder.id);
    if (!originalOrder) return;
    
    // Upload new files
    const newAttachmentPromises = newFiles.map(file => uploadFile(updatedOrder.id, file));
    const newAttachments = await Promise.all(newAttachmentPromises);

    // Determine removed attachments
    const existingStoragePaths = originalOrder.attachments?.map(a => a.storagePath) || [];
    const remainingStoragePaths = updatedOrder.attachments?.map(a => a.storagePath) || [];
    const removedAttachments = originalOrder.attachments?.filter(att => !remainingStoragePaths.includes(att.storagePath)) || [];

    // Delete removed files from storage
    const deletionPromises = removedAttachments.map(att => {
        const fileRef = ref(storage, att.storagePath);
        return deleteObject(fileRef);
    });
    await Promise.all(deletionPromises);

    const newChatMessages: OrderChatMessage[] = updatedOrder.chatMessages ? [...updatedOrder.chatMessages] : [];
    let hasChanges = false;

    // Check for status change
    if (originalOrder.status !== updatedOrder.status) {
        newChatMessages.push({
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${user.name} changed status from '${originalOrder.status}' to '${updatedOrder.status}'`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
        });
        hasChanges = true;
    }

    const simpleCompare = (obj1: any, obj2: any) => {
        const cleanedObj1 = { ...obj1, chatMessages: [], attachments: [], creationDate: null, deadline: null, status: null };
        const cleanedObj2 = { ...obj2, chatMessages: [], attachments: [], creationDate: null, deadline: null, status: null };
        return JSON.stringify(cleanedObj1) === JSON.stringify(cleanedObj2);
    }
    
    if (!hasChanges && !simpleCompare(originalOrder, updatedOrder)) {
       newChatMessages.push({
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${user.name} edited the order details`,
            timestamp: new Date().toISOString(),
            isSystemMessage: true,
        });
    }

    const orderWithSystemMessages = {
        ...updatedOrder,
        attachments: [...(updatedOrder.attachments || []), ...newAttachments],
        chatMessages: newChatMessages
    };
    
    const orderRef = doc(firestore, 'orders', updatedOrder.id);
    const { id, creationDate, ...rest } = orderWithSystemMessages;
    await updateDoc(orderRef, rest);
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    if (!firestore || !storage) return;

    // Delete all attachments from Firebase Storage
    const deletionPromises = (attachments || []).map(att => {
        const fileRef = ref(storage, att.storagePath);
        return deleteObject(fileRef);
    });

    try {
        await Promise.all(deletionPromises);
    } catch (error) {
        console.error("Error deleting some attachments from storage, but proceeding with Firestore deletion.", error);
    }

    const orderRef = doc(firestore, 'orders', orderId);
    await deleteDoc(orderRef);
  };

  const getOrderById = (orderId: string) => {
    return orders?.find(order => order.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders: orders || [], loading, addOrder, updateOrder, deleteOrder, getOrderById, uploadProgress }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error('useOrders must be used within an OrderProvider');
  }
  return context;
}
