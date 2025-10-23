"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Order } from '@/lib/types';
import { mockOrders } from '@/lib/mock-data';
import { useToast } from './use-toast';

interface OrderContextType {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  deleteOrder: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const { toast } = useToast();

  const addOrder = (order: Order) => {
    setOrders(prevOrders => [order, ...prevOrders]);
    toast({
        title: "Order Created",
        description: `New order ${order.id} has been added.`,
    });
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(prevOrders =>
      prevOrders.map(order => (order.id === updatedOrder.id ? updatedOrder : order))
    );
  };

  const deleteOrder = (orderId: string) => {
     updateOrder({ ...getOrderById(orderId)!, status: "Cancelled" });
  };

  const getOrderById = (orderId: string) => {
    return orders.find(order => order.id === orderId);
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrder, deleteOrder, getOrderById }}>
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
