
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, deleteDoc, updateDoc, setDoc, arrayUnion, writeBatch, query, where, getDocs, arrayRemove, Timestamp, getDoc } from 'firebase/firestore';
import type { Order, OrderAttachment, OrderChatMessage, Product } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { triggerNotification } from '@/lib/notifications';
import { uploadFileFlow, deleteFileFlow } from '@/ai/flows/backblaze-flow';
import { v4 as uuidv4 } from 'uuid';
import { compressImage, formatOrderUniqueName } from '@/lib/utils';
import { useProducts } from './use-products';
import { useUser } from './use-user';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id'>, isNew: boolean) => Promise<string | undefined>;
  updateOrder: (order: Partial<Order> & { id: string }, chatMessage?: { text: string; file?: File; }) => Promise<void>;
  deleteOrder: (orderId: string, attachments?: OrderAttachment[]) => Promise<void>;
  deleteMultipleOrders: (ordersToDelete: Order[]) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
  uploadProgress: Record<string, number>;
  addAttachment: (orderId: string, productIndex: number, file: File, isDesignFile?: boolean) => Promise<OrderAttachment | undefined>;
  removeAttachment: (orderId: string, productIndex: number, attachment: OrderAttachment, isDesignFile?: boolean) => Promise<void>;
  syncOrderUniqueNames: () => Promise<number>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

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

/** Helper to get initial image from product attachments */
const getInitialMainImage = (product: Product) => {
  const allAtts = [...(product.attachments || []), ...(product.designAttachments || [])];
  const firstImage = allAtts.find(att => att.fileName?.match(/\.(jpeg|jpg|gif|png|webp)$/i));
  return firstImage?.url;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { addOrderToCustomer } = useCustomers();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { addProduct, addOrderIdToProduct } = useProducts();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const ordersRef = useMemoFirebase(() => collection(firestore, 'orders'), [firestore]);
  const { data: orders, isLoading: loading } = useCollection<Order>(ordersRef);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        if (base64) resolve(base64);
        else reject(new Error("Failed to read file as base64."));
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
            contentType,
            fileName: file.name
        });
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        return { fileName: file.name, url: result.url, storagePath: result.fileName };
    } catch (error) {
        console.error(`Upload failed for ${fileName}:`, error);
        setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
        });
        throw error;
    } finally {
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
            await updateDoc(orderRef, { products: updatedProducts }).catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    operation: 'update',
                    path: orderRef.path,
                    requestResourceData: { products: updatedProducts }
                }));
                throw err;
            });
            return newAttachment;
        }
      } catch (error) {
          toast({ variant: "destructive", title: "Upload Failed", description: (error as Error).message || "Could not upload file." });
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
                productToUpdate.designAttachments = (productToUpdate.designAttachments || []).filter(att => att.storagePath !== attachment.storagePath);
            } else {
                 productToUpdate.attachments = (productToUpdate.attachments || []).filter(att => att.storagePath !== attachment.storagePath);
            }
            await updateDoc(orderRef, { products: updatedProducts }).catch(err => {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    operation: 'update',
                    path: orderRef.path,
                    requestResourceData: { products: updatedProducts }
                }));
                throw err;
            });
            toast({ title: "Attachment Removed", description: `${attachment.fileName} has been deleted.` });
        }
      } catch (error) {
           console.error("Failed to remove attachment:", error);
           toast({ variant: "destructive", title: "Deletion Failed", description: "Could not remove the attachment." });
      }
  };

  const addOrder = async (orderData: Omit<Order, 'id'>, isNew: boolean) => {
    if (!user) throw new Error("User must be logged in to add an order.");

    const products = orderData.products || [];
    const totalIncome = orderData.incomeAmount || 0;
    const totalPrepaid = orderData.prepaidAmount || 0;
    const existingOrderId = (orderData as any).id;
    const finalStatus = orderData.status === 'Pending' ? 'In Progress' : orderData.status;

    // Handle Split Case (Multiple products being finalized or created active)
    if (products.length > 1 && finalStatus !== 'Pending') {
        const batch = writeBatch(firestore);
        let firstOrderId = existingOrderId;

        // Extract shared data once to avoid spread overwrite confusion in the loop
        const { products: _, status: __, id: ___, chatMessages: ____, ...sharedBase } = orderData as any;

        for (let i = 0; i < products.length; i++) {
            const product = products[i];
            const isFirst = i === 0 && !!existingOrderId;
            const currentOrderId = isFirst ? existingOrderId : doc(collection(firestore, "orders")).id;
            const currentOrderRef = doc(firestore, 'orders', currentOrderId);
            
            if (i === 0) firstOrderId = currentOrderId;

            const productPrice = Number(product.price) || 0;
            const priceProportion = totalIncome > 0 ? (productPrice / totalIncome) : (1 / products.length);
            const productPrepaid = totalPrepaid * priceProportion;

            const splitOrder: any = {
                ...sharedBase,
                id: currentOrderId,
                products: [product], // SINGLE PRODUCT PER ORDER
                uniqueName: formatOrderUniqueName(orderData.customerName, [product], currentOrderId),
                mainImageUrl: getInitialMainImage(product),
                incomeAmount: productPrice,
                prepaidAmount: productPrepaid,
                status: finalStatus,
                chatMessages: isFirst ? (orderData.chatMessages || []) : [],
                ownerId: user.id,
                assignedTo: orderData.assignedTo || [],
                creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate,
                deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline,
                testDate: orderData.testDate ? (orderData.testDate instanceof Date ? Timestamp.fromDate(orderData.testDate) : orderData.testDate) : undefined,
            };

            const cleanData = removeUndefined(splitOrder);
            if (isFirst) {
                // Completely replace the draft document to ensure only one product exists
                batch.set(currentOrderRef, cleanData);
            } else {
                batch.set(currentOrderRef, cleanData);
                addOrderToCustomer(orderData.customerId, currentOrderId);
            }

            // Sync with global catalog
            if (product.productName) {
                (async () => {
                    const productsRef = collection(firestore, "products");
                    const q = query(productsRef, where("productName", "==", product.productName));
                    const querySnapshot = await getDocs(q);
                    if (querySnapshot.empty) {
                        const newProductId = await addProduct(product);
                        if (newProductId) await addOrderIdToProduct(newProductId, currentOrderId);
                    } else {
                        const existingProductId = querySnapshot.docs[0].id;
                        await addOrderIdToProduct(existingProductId, currentOrderId);
                    }
                })();
            }
        }

        await batch.commit().catch(err => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                operation: 'write',
                path: 'orders (split batch commit)'
            }));
            throw err;
        });

        toast({ title: "Orders Split", description: `Created ${products.length} separate orders.` });
        return firstOrderId;
    }

    // Standard Case (One product or staying as multi-product draft)
    if (isNew) {
        const newOrderRef = doc(collection(firestore, "orders"));
        const newId = newOrderRef.id;
        const uniqueName = formatOrderUniqueName(orderData.customerName, products, newId);
        
        const newOrder: Order = {
            ...orderData,
            id: newId,
            uniqueName,
            mainImageUrl: products.length === 1 ? getInitialMainImage(products[0]) : undefined,
            creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate as any,
            deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline as any,
            testDate: orderData.testDate ? (orderData.testDate instanceof Date ? Timestamp.fromDate(orderData.testDate) : orderData.testDate as any) : undefined,
            ownerId: user.id,
            status: orderData.status || 'Pending',
            assignedTo: orderData.assignedTo || [],
        };

        const cleanData = removeUndefined(newOrder);
        setDocumentNonBlocking(newOrderRef, cleanData, {});
        addOrderToCustomer(orderData.customerId, newId);
        return newId;
    }

    // Updating existing single-product finalized order
    if (!existingOrderId) throw new Error("Existing Order ID not found during save.");
    
    const orderRef = doc(firestore, 'orders', existingOrderId);
    const uniqueName = formatOrderUniqueName(orderData.customerName, products, existingOrderId);
    const finalData: Partial<Order> = {
        ...orderData,
        uniqueName,
        mainImageUrl: products.length === 1 ? getInitialMainImage(products[0]) : undefined,
        status: finalStatus,
        creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate as any,
        deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline as any,
        testDate: orderData.testDate ? (orderData.testDate instanceof Date ? Timestamp.fromDate(orderData.testDate) : orderData.testDate as any) : undefined,
    };

    const cleanData = removeUndefined(finalData);
    updateDocumentNonBlocking(orderRef, cleanData);

    if (products.length === 1 && products[0].productName) {
        const product = products[0];
        (async () => {
            const productsRef = collection(firestore, "products");
            const q = query(productsRef, where("productName", "==", product.productName));
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                const newProductId = await addProduct(product);
                if (newProductId) await addOrderIdToProduct(newProductId, existingOrderId);
            } else {
                const existingProductId = querySnapshot.docs[0].id;
                await addOrderIdToProduct(existingProductId, existingOrderId);
            }
        })();
    }

    return existingOrderId;
  };

  const updateOrder = async (orderData: Partial<Order> & { id: string }, chatMessage?: { text: string; file?: File; }) => {
    if (!user) throw new Error("User must be logged in to update an order.");
    const orderRef = doc(firestore, 'orders', orderData.id);
    const originalOrder = orders?.find(o => o.id === orderData.id);
    
    const targetStatus = orderData.status || originalOrder?.status || 'Pending';
    const targetProducts = orderData.products || originalOrder?.products || [];

    // Detect transition from Pending -> Finalized with multiple products OR any multiple product case that isn't Pending
    if (targetStatus !== 'Pending' && targetProducts.length > 1) {
        const mergedData = { ...originalOrder, ...orderData };
        await addOrder(mergedData as any, false);
        return; 
    }

    const finalCustomerName = orderData.customerName || originalOrder?.customerName;
    const finalProducts = targetProducts;
    const uniqueName = formatOrderUniqueName(finalCustomerName, finalProducts, orderData.id);
    
    let mainImageUrl = orderData.mainImageUrl || originalOrder?.mainImageUrl;
    if (!mainImageUrl && finalProducts && finalProducts.length === 1) {
      mainImageUrl = getInitialMainImage(finalProducts[0]);
    }

    const dataToUpdate: any = { ...orderData, uniqueName, mainImageUrl };
    delete dataToUpdate.id; 
    delete dataToUpdate.chatMessages;
    
    if (dataToUpdate.creationDate instanceof Date) dataToUpdate.creationDate = Timestamp.fromDate(dataToUpdate.creationDate);
    if (dataToUpdate.deadline instanceof Date) dataToUpdate.deadline = Timestamp.fromDate(dataToUpdate.deadline);
    if (dataToUpdate.testDate instanceof Date) dataToUpdate.testDate = Timestamp.fromDate(dataToUpdate.testDate);

    const timestamp = new Date().toISOString();
    const newMessages: OrderChatMessage[] = [];
    if (originalOrder) {
        const createSystemMsg = (text: string) => ({ id: uuidv4(), user: { id: 'system', name: 'System', avatarUrl: '' }, text: `${text} by ${user.name}.`, timestamp, isSystemMessage: true });
        if (orderData.status && originalOrder.status !== orderData.status) {
            newMessages.push(createSystemMsg(`Status changed from '${originalOrder.status}' to '${orderData.status}'`));
        }
        if (orderData.isUrgent !== undefined && originalOrder.isUrgent !== orderData.isUrgent) {
            newMessages.push(createSystemMsg(`Order ${orderData.isUrgent ? 'marked as URGENT' : 'urgency removed'}`));
        }
    }
    if (chatMessage && (chatMessage.text.trim() || chatMessage.file)) {
        const msg: OrderChatMessage = { id: uuidv4(), user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }, text: chatMessage.text, timestamp };
        if (chatMessage.file) msg.attachment = await handleFileUpload(chatMessage.file);
        newMessages.push(msg);
    }

    const cleanData = removeUndefined(dataToUpdate);
    const batch = writeBatch(firestore);
    if (Object.keys(cleanData).length > 0) batch.update(orderRef, cleanData);
    if (newMessages.length > 0) batch.update(orderRef, { chatMessages: arrayUnion(...newMessages) });
    
    await batch.commit().catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ operation: 'update', path: orderRef.path }));
        throw err;
    });
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
      const orderRef = doc(firestore, 'orders', orderId);
      const orderToDelete = orders?.find(o => o.id === orderId);
      
      if (orderToDelete && Array.isArray(orderToDelete.products)) {
          for (const product of orderToDelete.products) {
              if (product.id) {
                  const productRef = doc(firestore, 'products', product.id);
                  try {
                      const productSnap = await getDoc(productRef);
                      if (productSnap.exists()) await updateDoc(productRef, { orderIds: arrayRemove(orderId) });
                  } catch (e) {}
              }
          }
      }
      
      await deleteDoc(orderRef).catch(err => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({ operation: 'delete', path: orderRef.path }));
          throw err;
      });

      const allAtts = attachments.concat(orderToDelete?.products?.flatMap(p => [...(p.attachments || []), ...(p.designAttachments || [])]) || []);
      const uniqueAtts = Array.from(new Map(allAtts.map(it => it.storagePath && [it.storagePath, it])).values()).filter(Boolean);
      await Promise.all(uniqueAtts.map(att => att.storagePath ? deleteFileFlow({ fileName: att.storagePath }).catch(() => {}) : Promise.resolve()));
  };
  
  const deleteMultipleOrders = async (ordersToDelete: Order[]) => {
    if (!ordersToDelete || ordersToDelete.length === 0) return;
    try {
      const batch = writeBatch(firestore);
      let allAtts: OrderAttachment[] = [];
      
      for (const order of ordersToDelete) {
        batch.delete(doc(firestore, 'orders', order.id));
        if (Array.isArray(order.products)) {
            for (const p of order.products) {
                if (p.id) batch.update(doc(firestore, 'products', p.id), { orderIds: arrayRemove(order.id) });
                allAtts = allAtts.concat([...(p.attachments || []), ...(p.designAttachments || [])]);
            }
        }
      }
      
      await batch.commit().catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({ operation: 'delete', path: 'orders' }));
        throw err;
      });

      const uniqueAtts = Array.from(new Map(allAtts.map(it => it.storagePath && [it.storagePath, it])).values()).filter(Boolean);
      await Promise.all(uniqueAtts.map(att => att.storagePath ? deleteFileFlow({ fileName: att.storagePath }).catch(() => {}) : Promise.resolve()));
    } catch (error) {
        toast({ variant: "destructive", title: "Deletion Failed", description: "Error during batch deletion." });
    }
  };
  
  const getOrderById = useCallback((orderId: string) => orders?.find(order => order.id === orderId), [orders]);

  const syncOrderUniqueNames = useCallback(async (): Promise<number> => {
    if (!orders || orders.length === 0) return 0;
    const batch = writeBatch(firestore);
    let updatedCount = 0;
    for (const order of orders) {
      const expectedName = formatOrderUniqueName(order.customerName, order.products, order.id);
      if (order.uniqueName !== expectedName) {
        batch.update(doc(firestore, 'orders', order.id), { uniqueName: expectedName });
        updatedCount++;
      }
    }
    if (updatedCount > 0) await batch.commit();
    return updatedCount;
  }, [firestore, orders]);
  
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
      syncOrderUniqueNames,
  }), [orders, loading, uploadProgress, getOrderById, addAttachment, removeAttachment, addOrder, updateOrder, deleteOrder, deleteMultipleOrders, syncOrderUniqueNames]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error('useOrders must be used within a OrderProvider');
  return context;
}
