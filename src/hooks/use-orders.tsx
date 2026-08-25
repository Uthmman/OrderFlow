
"use client";

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback } from 'react';
import { collection, doc, deleteDoc, updateDoc, setDoc, arrayUnion, writeBatch, query, where, getDocs, arrayRemove, Timestamp, getDoc } from 'firebase/firestore';
import type { Order, OrderAttachment, OrderChatMessage, Product, OrderStatus } from '@/lib/types';
import { useToast } from './use-toast';
import { useCustomers } from './use-customers';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
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
  updateMultipleOrdersStatus: (orders: Order[], newStatus: OrderStatus) => Promise<void>;
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
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) newObj[key] = removeUndefined(obj[key]);
  });
  return newObj;
};

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
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
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
        const result = await uploadFileFlow({ fileContent, contentType, fileName: file.name });
        setUploadProgress(prev => ({ ...prev, [fileName]: 100 }));
        return { fileName: file.name, url: result.url, storagePath: result.fileName };
    } catch (error) {
        setUploadProgress(prev => { const n = { ...prev }; delete n[fileName]; return n; });
        throw error;
    } finally {
       setTimeout(() => setUploadProgress(prev => { const n = { ...prev }; delete n[fileName]; return n; }), 2000);
    }
  };
  
  const addAttachment = async (orderId: string, productIndex: number, file: File, isDesignFile = false): Promise<OrderAttachment | undefined> => {
      try {
        const newAttachment = await handleFileUpload(file);
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        if (currentOrder) {
            const updatedProducts = [...currentOrder.products];
            const p = updatedProducts[productIndex];
            if (isDesignFile) p.designAttachments = [...(p.designAttachments || []), newAttachment];
            else p.attachments = [...(p.attachments || []), newAttachment];
            await updateDoc(orderRef, { products: updatedProducts });
            return newAttachment;
        }
      } catch (error) {
          toast({ variant: "destructive", title: "Upload Failed", description: (error as Error).message });
          return undefined;
      }
  };

  const removeAttachment = async (orderId: string, productIndex: number, attachment: OrderAttachment, isDesignFile = false) => {
      try {
        if (attachment.storagePath) await deleteFileFlow({ fileName: attachment.storagePath });
        const orderRef = doc(firestore, 'orders', orderId);
        const currentOrder = orders?.find(o => o.id === orderId);
        if (currentOrder) {
            const updatedProducts = [...currentOrder.products];
            const p = updatedProducts[productIndex];
            if (isDesignFile) p.designAttachments = (p.designAttachments || []).filter(att => att.storagePath !== attachment.storagePath);
            else p.attachments = (p.attachments || []).filter(att => att.storagePath !== attachment.storagePath);
            await updateDoc(orderRef, { products: updatedProducts });
        }
      } catch (error) { toast({ variant: "destructive", title: "Deletion Failed" }); }
  };

  const addOrder = async (orderData: Omit<Order, 'id'>, isNew: boolean) => {
    if (!user) throw new Error("User must be logged in.");

    const products = orderData.products || [];
    const totalIncome = orderData.incomeAmount || 0;
    const totalPrepaid = orderData.prepaidAmount || 0;
    const existingOrderId = (orderData as any).id;
    const finalStatus = orderData.status === 'Pending' ? 'In Progress' : orderData.status;

    if (products.length > 1 && finalStatus !== 'Pending') {
        const batch = writeBatch(firestore);
        let firstOrderId = existingOrderId;

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
                ...orderData,
                id: currentOrderId,
                products: [product],
                uniqueName: formatOrderUniqueName(orderData.customerName, [product], currentOrderId),
                mainImageUrl: getInitialMainImage(product),
                incomeAmount: productPrice,
                prepaidAmount: productPrepaid,
                status: finalStatus,
                ownerId: user.id,
                creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate,
                deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline,
            };

            batch.set(currentOrderRef, removeUndefined(splitOrder));
            if (!isFirst) addOrderToCustomer(orderData.customerId, currentOrderId);
        }

        await batch.commit();
        toast({ title: "Orders Split", description: `Created ${products.length} separate orders.` });
        return firstOrderId;
    }

    if (isNew) {
        const newOrderRef = doc(collection(firestore, "orders"));
        const newId = newOrderRef.id;
        const newOrder: Order = {
            ...orderData,
            id: newId,
            uniqueName: formatOrderUniqueName(orderData.customerName, products, newId),
            mainImageUrl: products.length === 1 ? getInitialMainImage(products[0]) : undefined,
            status: orderData.status || 'Pending',
            ownerId: user.id,
            creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate as any,
            deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline as any,
        };
        setDocumentNonBlocking(newOrderRef, removeUndefined(newOrder), {});
        addOrderToCustomer(orderData.customerId, newId);
        return newId;
    }

    const orderRef = doc(firestore, 'orders', existingOrderId);
    const finalData = {
        ...orderData,
        uniqueName: formatOrderUniqueName(orderData.customerName, products, existingOrderId),
        mainImageUrl: products.length === 1 ? getInitialMainImage(products[0]) : undefined,
        status: finalStatus,
        creationDate: orderData.creationDate instanceof Date ? Timestamp.fromDate(orderData.creationDate) : orderData.creationDate as any,
        deadline: orderData.deadline instanceof Date ? Timestamp.fromDate(orderData.deadline) : orderData.deadline as any,
    };
    updateDocumentNonBlocking(orderRef, removeUndefined(finalData));
    return existingOrderId;
  };

  const updateOrder = async (orderData: Partial<Order> & { id: string }, chatMessage?: { text: string; file?: File; }) => {
    if (!user) return;
    const orderRef = doc(firestore, 'orders', orderData.id);
    const originalOrder = orders?.find(o => o.id === orderData.id);
    
    if (orderData.status && orderData.status !== 'Pending' && (orderData.products?.length || originalOrder?.products?.length || 0) > 1) {
        const mergedData = { ...originalOrder, ...orderData };
        await addOrder(mergedData as any, false);
        return; 
    }

    const finalProducts = orderData.products || originalOrder?.products || [];
    const dataToUpdate: any = { 
        ...orderData, 
        uniqueName: formatOrderUniqueName(orderData.customerName || originalOrder?.customerName, finalProducts, orderData.id),
        mainImageUrl: finalProducts.length === 1 ? getInitialMainImage(finalProducts[0]) : (orderData.mainImageUrl || originalOrder?.mainImageUrl)
    };
    delete dataToUpdate.id; 
    delete dataToUpdate.chatMessages;
    
    if (dataToUpdate.creationDate instanceof Date) dataToUpdate.creationDate = Timestamp.fromDate(dataToUpdate.creationDate);
    if (dataToUpdate.deadline instanceof Date) dataToUpdate.deadline = Timestamp.fromDate(dataToUpdate.deadline);

    const timestamp = new Date().toISOString();
    const newMessages: OrderChatMessage[] = [];
    if (originalOrder) {
        if (orderData.status && originalOrder.status !== orderData.status) {
            newMessages.push({ id: uuidv4(), user: { id: 'system', name: 'System', avatarUrl: '' }, text: `Status changed to '${orderData.status}' by ${user.name}.`, timestamp, isSystemMessage: true });
        }
    }
    if (chatMessage && (chatMessage.text.trim() || chatMessage.file)) {
        const msg: OrderChatMessage = { id: uuidv4(), user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl }, text: chatMessage.text, timestamp };
        if (chatMessage.file) msg.attachment = await handleFileUpload(chatMessage.file);
        newMessages.push(msg);
    }

    const batch = writeBatch(firestore);
    const cleanData = removeUndefined(dataToUpdate);
    if (Object.keys(cleanData).length > 0) batch.update(orderRef, cleanData);
    if (newMessages.length > 0) batch.update(orderRef, { chatMessages: arrayUnion(...newMessages) });
    await batch.commit();
  };

  const updateMultipleOrdersStatus = async (ordersToUpdate: Order[], newStatus: OrderStatus) => {
    if (!user) return;
    const batch = writeBatch(firestore);
    const timestamp = new Date().toISOString();
    ordersToUpdate.forEach(order => {
        batch.update(doc(firestore, 'orders', order.id), { 
            status: newStatus,
            chatMessages: arrayUnion({ id: uuidv4(), user: { id: 'system', name: 'System', avatarUrl: '' }, text: `Bulk status update to '${newStatus}' by ${user.name}.`, timestamp, isSystemMessage: true })
        });
    });
    await batch.commit();
    toast({ title: "Updated", description: `${ordersToUpdate.length} orders updated.` });
  };

  const deleteOrder = async (orderId: string, attachments: OrderAttachment[] = []) => {
      await deleteDoc(doc(firestore, 'orders', orderId));
      attachments.forEach(att => att.storagePath && deleteFileFlow({ fileName: att.storagePath }));
  };
  
  const deleteMultipleOrders = async (ordersToDelete: Order[]) => {
    const batch = writeBatch(firestore);
    ordersToDelete.forEach(o => batch.delete(doc(firestore, 'orders', o.id)));
    await batch.commit();
  };
  
  const getOrderById = useCallback((orderId: string) => orders?.find(order => order.id === orderId), [orders]);

  const syncOrderUniqueNames = useCallback(async (): Promise<number> => {
    if (!orders) return 0;
    const batch = writeBatch(firestore);
    let count = 0;
    for (const order of orders) {
      const expected = formatOrderUniqueName(order.customerName, order.products, order.id);
      if (order.uniqueName !== expected) { batch.update(doc(firestore, 'orders', order.id), { uniqueName: expected }); count++; }
    }
    if (count > 0) await batch.commit();
    return count;
  }, [firestore, orders]);
  
  const value = useMemo(() => ({
      orders: orders || [], loading, addOrder, updateOrder, updateMultipleOrdersStatus, deleteOrder, deleteMultipleOrders, getOrderById, uploadProgress, addAttachment, removeAttachment, syncOrderUniqueNames,
  }), [orders, loading, uploadProgress, getOrderById, addAttachment, removeAttachment, addOrder, updateOrder, updateMultipleOrdersStatus, deleteOrder, deleteMultipleOrders, syncOrderUniqueNames]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}

export function useOrders() {
  const context = useContext(OrderContext);
  if (context === undefined) throw new Error('useOrders must be used within a OrderProvider');
  return context;
}
