

"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, serverTimestamp, deleteDoc, updateDoc, setDoc, arrayUnion, writeBatch, query, where, getDocs, arrayRemove, Timestamp, getDoc } from 'firebase/firestore';
import type { Order, OrderAttachment, OrderChatMessage, Product } from '@/lib/types';
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
import { useProducts } from './use-products';


interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id'>, isNew: boolean) => Promise<string | undefined>;
  updateOrder: (order: Order, chatMessage?: { text: string; file?: File; }) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  deleteMultipleOrders: (ordersToDelete: Order[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
  addAttachment: (orderId: string, productIndex: number, file: File, isDesignFile?: boolean) => Promise<OrderAttachment | undefined>;
  removeAttachment: (orderId: string, productIndex: number, attachment: OrderAttachment, isDesignFile?: boolean) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

// Helper function to remove undefined values from an object
const removeUndefined = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
  }

  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      newObj[key] = removeUndefined(value);
    }
  });
  return newObj;
};


export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { addProduct, updateProduct, addOrderIdToProduct } = useProducts();
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
  
  const addAttachment = async (orderId: string, productIndex: number, file: File, isDesignFile = false): Promise<OrderAttachment | undefined> => {
      try {
        const newAttachment = await handleFileUpload(file);
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        if (currentOrder) {
            const updatedProducts = [...currentOrder.products];
            const productToUpdate = updatedProducts[productIndex];
            
            if (isDesignFile) {
                productToUpdate.designAttachments = [...(productToUpdate.designAttachments || []), newAttachment];
            } else {
                productToUpdate.attachments = [...(productToUpdate.attachments || []), newAttachment];
            }
            
            await updateDoc(orderRef, { products: updatedProducts });
            return newAttachment;
        }
      } catch (error) {
          // Error is already handled by handleFileUpload
          return undefined;
      }
  };

  const removeAttachment = async (orderId: string, productIndex: number, attachment: OrderAttachment, isDesignFile = false) => {
      try {
        if (attachment.storagePath) {
          await deleteFileFlow({ fileName: attachment.storagePath });
        }
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        if (currentOrder) {
            const updatedProducts = [...currentOrder.products];
            const productToUpdate = updatedProducts[productIndex];

            if (isDesignFile) {
                productToUpdate.designAttachments = (productToUpdate.designAttachments || []).filter(
                    att => att.storagePath !== attachment.storagePath
                );
            } else {
                 productToUpdate.attachments = (productToUpdate.attachments || []).filter(
                    att => att.storagePath !== attachment.storagePath
                );
            }

            await updateDoc(orderRef, { products: updatedProducts });
            toast({
                title: "Attachment Removed",
                description: `${attachment.fileName} has been deleted.`
            });
        }
      } catch (error) {
           console.error("Failed to remove attachment:", error);
           toast({
                variant: "destructive",
                title: "Deletion Failed",
                description: "Could not remove the attachment.",
            });
      }
  }


  const addOrder = async (orderData: Omit<Order, 'id'>, isNew: boolean) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    if (isNew) {
        // Check if we are creating a new product or using an existing one.
        for (const product of orderData.products) {
            if (!product.productName) continue;

            const productsRef = collection(firestore, "products");
            const q = query(productsRef, where("productName", "==", product.productName));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                // Product doesn't exist, so add it to the catalog.
                await addProduct(product);
            }
        }
    }
    
    const newOrderRef = doc(collection(firestore, "orders"));
    const orderId = newOrderRef.id;
    
    const finalOrderData: Order = {
        ...orderData,
        id: orderId,
        creationDate: Timestamp.fromDate(orderData.creationDate as Date),
        deadline: Timestamp.fromDate(orderData.deadline as Date),
        testDate: orderData.testDate ? Timestamp.fromDate(orderData.testDate as Date) : undefined,
        ownerId: user.id,
        status: orderData.status || 'Pending',
    };
    
    const cleanData = removeUndefined(finalOrderData);
    await setDoc(newOrderRef, cleanData, {});

    await addOrderToCustomer(orderData.customerId, orderId);

    // Add orderId to the product's order history
    for (const product of orderData.products) {
        if (product.id) {
            await addOrderIdToProduct(product.id, orderId);
        }
    }

    if (orderData.status !== 'Pending') {
        triggerNotification(firestore, [user.id], {
          type: 'New Order Created',
          message: `You created a new order: #${orderId.slice(-5)}.`,
          orderId: orderId
        });
    }
    
    return orderId;
  };

  const updateOrder = async (orderData: Order, chatMessage?: { text: string; file?: File; }) => {
    if (!user) throw new Error("User must be logged in to update an order.");

    const orderRef = doc(firestore, 'orders', orderData.id);
    const originalOrder = orders?.find(o => o.id === orderData.id);

    const dataToUpdate: Partial<Order> = { ...orderData };
    delete (dataToUpdate as any).id; 

    // Convert JS Dates back to Firestore Timestamps before saving
    if (dataToUpdate.creationDate instanceof Date) {
        dataToUpdate.creationDate = Timestamp.fromDate(dataToUpdate.creationDate);
    }
    if (dataToUpdate.deadline instanceof Date) {
        dataToUpdate.deadline = Timestamp.fromDate(dataToUpdate.deadline);
    }
    if (dataToUpdate.testDate) {
        if (dataToUpdate.testDate instanceof Date) {
             dataToUpdate.testDate = Timestamp.fromDate(dataToUpdate.testDate);
        }
    } else {
        dataToUpdate.testDate = undefined;
    }


    const usersToNotify = Array.from(new Set([
        ...(orderData.assignedTo || []),
        orderData.ownerId,
    ])).filter(id => id !== user.id);

    const timestamp = new Date().toISOString();
    
    const newMessages: OrderChatMessage[] = [];

    if (originalOrder) {
        const createSystemMessage = (text: string) => ({
            id: uuidv4(),
            user: { id: 'system', name: 'System', avatarUrl: '' },
            text: `${text} by ${user.name}.`,
            timestamp,
            isSystemMessage: true
        });

        if (originalOrder.status !== orderData.status) {
            newMessages.push(createSystemMessage(`Status changed from '${originalOrder.status}' to '${orderData.status}'`));
            if (usersToNotify.length > 0) {
                triggerNotification(firestore, usersToNotify, { type: `Order ${orderData.status}`, message: `Order #${orderData.id.slice(-5)} status was updated to ${orderData.status}.`, orderId: orderData.id });
            }
            if (orderData.status === 'Completed') {
                for (const product of orderData.products) {
                    const productsRef = collection(firestore, "products");
                    const q = query(productsRef, where("productName", "==", product.productName));
                    const querySnapshot = await getDocs(q);

                    if (querySnapshot.empty) {
                        await addProduct(product);
                    } else {
                        const existingProductId = querySnapshot.docs[0].id;
                        await updateProduct(existingProductId, product);
                    }
                }
            }
        }
        if (originalOrder.isUrgent !== orderData.isUrgent) {
            const urgencyText = orderData.isUrgent ? 'marked as URGENT' : 'urgency removed';
            newMessages.push(createSystemMessage(`Order ${urgencyText}`));
            if (usersToNotify.length > 0) {
                triggerNotification(firestore, usersToNotify, { type: `Order Urgency Changed`, message: `Order #${orderData.id.slice(-5)} was ${urgencyText}.`, orderId: orderData.id });
            }
        }
    }

    if (chatMessage && (chatMessage.text.trim() || chatMessage.file)) {
        const newChatMessage: OrderChatMessage = {
            id: uuidv4(),
            user: {
                id: user.id,
                name: user.name || 'User',
                avatarUrl: user.avatarUrl || '',
            },
            text: chatMessage.text,
            timestamp,
        };

        if (chatMessage.file) {
            try {
                const uploadedAttachment = await handleFileUpload(chatMessage.file);
                newChatMessage.attachment = uploadedAttachment;
            } catch (error) {
                throw error;
            }
        }
        newMessages.push(newChatMessage);
        
        if (usersToNotify.length > 0) {
            triggerNotification(firestore, usersToNotify, {
                type: 'New Message in Order',
                message: `${user.name} wrote: "${newChatMessage.text}"`,
                orderId: orderData.id,
            });
        }
    }

    if (newMessages.length > 0) {
        dataToUpdate.chatMessages = arrayUnion(...newMessages) as any;
    } else {
        delete dataToUpdate.chatMessages;
    }
    
    const cleanData = removeUndefined(dataToUpdate);
    if (Object.keys(cleanData).length > 0) {
        await updateDoc(orderRef, cleanData);
    }
};

 const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
    const orderRef = doc(firestore, 'orders', orderId);
    
    const orderToDelete = orders?.find(o => o.id === orderId);
    if(orderToDelete) {
        for (const product of orderToDelete.products) {
            if (product.id) {
                const productRef = doc(firestore, 'products', product.id);
                try {
                    const productSnap = await getDoc(productRef);
                    if (productSnap.exists()) {
                        await updateDoc(productRef, {
                            orderIds: arrayRemove(orderId)
                        });
                    }
                } catch (e) {
                    console.error(`Failed to update product ${product.id}:`, e);
                }
            }
        }
    }

    deleteDocumentNonBlocking(orderRef);

    const allAttachments = attachments.concat(
      orderToDelete?.products.flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]) || []
    );
    
    const uniqueAttachments = Array.from(new Map(allAttachments.map(item => [item.storagePath, item])).values());

    const deletePromises = (uniqueAttachments || []).map(att => {
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

  const deleteMultipleOrders = async (ordersToDelete: Order[]) => {
    if (ordersToDelete.length === 0) return;

    try {
        const batch = writeBatch(firestore);
        let allAttachments: OrderAttachment[] = [];

        // 1. Gather all product IDs to check
        const productUpdateMap = new Map<string, string[]>();
        
        for (const order of ordersToDelete) {
            const orderRef = doc(firestore, 'orders', order.id);
            batch.delete(orderRef);

            for (const product of order.products) {
                if (product.id) {
                    if (!productUpdateMap.has(product.id)) {
                        productUpdateMap.set(product.id, []);
                    }
                    productUpdateMap.get(product.id)!.push(order.id);
                }
            }
            const orderAttachments = order.products.flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]);
            allAttachments = allAttachments.concat(orderAttachments);
        }

        // 2. Update existing products in the batch
        for (const [productId, orderIdsToRemove] of productUpdateMap.entries()) {
            const productRef = doc(firestore, 'products', productId);
            // We assume the product exists. A more robust solution might check existence
            // but for a batch operation, this is often an acceptable trade-off.
            batch.update(productRef, {
                orderIds: arrayRemove(...orderIdsToRemove)
            });
        }
        
        // 3. Commit Firestore changes
        await batch.commit();

        // 4. Delete attachments from storage
        const uniqueAttachments = Array.from(new Map(allAttachments.map(item => item.storagePath && [item.storagePath, item])).values()).filter(Boolean);
        const deleteFilePromises = uniqueAttachments.map(att => {
            if (!att.storagePath) return Promise.resolve();
            return deleteFileFlow({ fileName: att.storagePath }).catch(err => console.error(`Failed to delete ${att.fileName}:`, err));
        });
        
        await Promise.all(deleteFilePromises);
        
    } catch (error) {
        console.error("Failed to delete orders in batch:", error);
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "An error occurred while deleting the selected orders.",
        });
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
      deleteMultipleOrders,
      getOrderById,
      uploadProgress,
      addAttachment,
      removeAttachment,
  }), [orders, loading, uploadProgress, getOrderById, addAttachment, removeAttachment, addOrder, updateOrder, deleteOrder, deleteMultipleOrders]);

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
