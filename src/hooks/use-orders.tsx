"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import type { Order } from '@/lib/types';
import { useToast } from './use-toast';
import { useCollection } from '@/firebase';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

interface OrderContextType {
  orders: Order[];
  loading: boolean;
  addOrder: (order: Omit<Order, 'id' | 'creationDate'>) => Promise<string>;
  updateOrder: (order: Order) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { user } = useUser();
  const { data: orders, loading } = useCollection<Order>(firestore ? collection(firestore, 'orders') : null);
  const { toast } = useToast();

  const addOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>) => {
    if (!firestore || !user) throw new Error("Firestore or user not available");
    const ordersCollection = collection(firestore, 'orders');
    const newOrderDoc = await addDoc(ordersCollection, {
      ...orderData,
      creationDate: serverTimestamp(),
      ownerId: user.uid,
    });
    return newOrderDoc.id;
  };

  const updateOrder = async (updatedOrder: Order) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', updatedOrder.id);
    // Don't include id, creationDate in the update payload
    const { id, creationDate, ...rest } = updatedOrder;
    await updateDoc(orderRef, rest);
  };

  const deleteOrder = async (orderId: string) => {
    if (!firestore) return;
    const orderRef = doc(firestore, 'orders', orderId);
    await deleteDoc(orderRef);
  };

  const getOrderById = (orderId: string) => {
    return orders?.find(order => order.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders: orders || [], loading, addOrder, updateOrder, deleteOrder, getOrderById }}>
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
