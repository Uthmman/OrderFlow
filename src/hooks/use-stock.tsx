'use client';

import React, { createContext, useContext, ReactNode, useCallback, useState, useEffect, useOptimistic } from 'react';
import { collection, doc, setDoc, updateDoc, increment, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';
import type { StockItem, StockTransaction, StockTransactionType, StockSettings } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useToast } from './use-toast';
import { useUser, useUsers } from './use-user';
import { useOrders } from './use-orders';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { v4 as uuidv4 } from 'uuid';
import { triggerNotification } from '@/lib/notifications';

interface StockContextType {
  stockItems: StockItem[];
  optimisticItems: StockItem[];
  transactions: StockTransaction[];
  stockSettings: { categories: string[] } | null;
  loading: boolean;
  addStockItem: (item: Omit<StockItem, 'id' | 'currentQuantity' | 'lastUpdated'>) => Promise<string | undefined>;
  adjustStock: (params: { itemId: string; type: StockTransactionType; quantity: number; reason: string; orderId?: string }) => Promise<void>;
  deleteStockItem: (itemId: string) => Promise<void>;
  getItemById: (id: string) => StockItem | undefined;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { users } = useUsers();
  const { orders } = useOrders();
  const { toast } = useToast();
  const { firestore: mainFirestore } = useFirebase();
  const [isSecondaryAuthReady, setIsSecondaryAuthReady] = useState(false);

  useEffect(() => {
    ensureSecondaryAuth().then(() => setIsSecondaryAuthReady(true));
  }, []);

  const firestore = getSecondaryFirestore();

  // Unified items collection (contains stockLevel)
  const itemsRef = useMemoFirebase(
    () => isSecondaryAuthReady ? collection(firestore, 'items') : null, 
    [firestore, isSecondaryAuthReady]
  );
  const { data: rawItems, isLoading: itemsLoading } = useCollection<any>(itemsRef as any);

  // Stock Adjustments collection (history) - ordered by adjustmentDate to match DB
  const adjustmentsRef = useMemoFirebase(
    () => isSecondaryAuthReady ? query(collection(firestore, 'stockAdjustments'), orderBy('adjustmentDate', 'desc')) : null, 
    [firestore, isSecondaryAuthReady]
  );
  const { data: rawAdjustments, isLoading: txLoading } = useCollection<any>(adjustmentsRef as any);

  // Categories collection
  const categoriesRef = useMemoFirebase(
    () => isSecondaryAuthReady ? collection(firestore, 'categories') : null,
    [firestore, isSecondaryAuthReady]
  );
  const { data: rawCategories, isLoading: categoriesLoading } = useCollection<any>(categoriesRef as any);

  const stockItems = (rawItems || []).map(item => ({
    ...item,
    currentQuantity: Number(item.stockLevel) || 0,
    unit: item.unit || 'pcs'
  })) as StockItem[];

  // Process raw adjustments to match StockTransaction type used in UI
  const transactions = (rawAdjustments || []).map(tx => ({
    ...tx,
    quantity: Math.abs(tx.adjustmentQuantity || tx.quantity || 0),
    timestamp: tx.adjustmentDate || tx.timestamp,
    userName: tx.userName || 'Workshop Team',
  })) as StockTransaction[];

  const stockSettings = {
    categories: (rawCategories || []).map(c => c.name)
  };

  // Optimistic UI for stock levels
  const [optimisticItems, addOptimisticAdjustment] = useOptimistic(
    stockItems,
    (state, adjustment: { itemId: string, change: number }) => {
        return state.map(item => 
            item.id === adjustment.itemId 
            ? { ...item, currentQuantity: item.currentQuantity + adjustment.change }
            : item
        );
    }
  );

  const addStockItem = useCallback(async (itemData: Omit<StockItem, 'id' | 'currentQuantity' | 'lastUpdated'>) => {
    try {
      const newItemRef = doc(collection(firestore, 'items'));
      const newItem = {
        ...itemData,
        stockLevel: 0,
        lastUpdated: serverTimestamp(),
      };
      await setDoc(newItemRef, newItem);
      toast({ title: "Item Added", description: `${itemData.name} has been added to inventory.` });
      return newItemRef.id;
    } catch (error) {
      console.error("Error adding stock item:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not add inventory item." });
    }
  }, [firestore, toast]);

  const adjustStock = useCallback(async ({ itemId, type, quantity, reason, orderId }: { itemId: string; type: StockTransactionType; quantity: number; reason: string; orderId?: string }) => {
    if (!user) return;
    
    const qtyChange = type === 'In' ? quantity : -quantity;
    addOptimisticAdjustment({ itemId, change: qtyChange });

    try {
      const adjustmentId = uuidv4();
      const adjRef = doc(firestore, 'stockAdjustments', adjustmentId);
      const itemRef = doc(firestore, 'items', itemId);
      
      const foundItem = stockItems.find(i => i.id === itemId);
      const foundOrder = orders.find(o => o.id === orderId);

      const transaction = {
        id: adjustmentId,
        itemId,
        itemName: foundItem?.name || 'Unknown Item',
        type,
        adjustmentQuantity: qtyChange,
        adjustmentDate: new Date().toISOString(),
        reason,
        orderId: orderId || 'none',
        orderUniqueName: foundOrder?.uniqueName || 'General Shop',
        userId: user.id,
        userName: user.name || 'Unknown User',
      };
      
      await setDoc(adjRef, transaction);
      await updateDoc(itemRef, {
        stockLevel: increment(qtyChange),
        lastUpdated: serverTimestamp(),
      });

      // Notify Admins
      const adminIds = users.filter(u => u.role === 'Admin' && u.id !== user.id).map(u => u.id);
      if (adminIds.length > 0) {
        triggerNotification(mainFirestore, adminIds, {
          type: 'Stock Movement',
          message: `${user.name} adjusted ${foundItem?.name || 'item'}: ${qtyChange > 0 ? '+' : ''}${qtyChange} ${foundItem?.unit || ''}`,
          orderId: orderId !== 'none' ? orderId : undefined
        });
      }

      toast({ 
        title: type === 'In' ? "Stock Added" : "Stock Used", 
        description: `${quantity} units recorded.` 
      });
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to record stock adjustment." });
    }
  }, [firestore, mainFirestore, user, users, orders, stockItems, toast, addOptimisticAdjustment]);

  const deleteStockItem = useCallback(async (itemId: string) => {
    try {
      await deleteDoc(doc(firestore, 'items', itemId));
      toast({ title: "Item Deleted", description: "Inventory item removed." });
    } catch (error) {
      console.error("Error deleting stock item:", error);
    }
  }, [firestore, toast]);

  const getItemById = useCallback((id: string) => {
    return stockItems?.find(item => item.id === id);
  }, [stockItems]);

  const value = {
    stockItems,
    optimisticItems,
    transactions,
    stockSettings,
    loading: !isSecondaryAuthReady || itemsLoading || txLoading || categoriesLoading,
    addStockItem,
    adjustStock,
    deleteStockItem,
    getItemById,
  };

  return (
    <StockContext.Provider value={value}>
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const context = useContext(StockContext);
  if (context === undefined) {
    throw new Error('useStock must be used within a StockProvider');
  }
  return context;
}