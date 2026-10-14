
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect, useOptimistic } from 'react';
import { collection, doc, setDoc, updateDoc, increment, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';
import type { StockItem, StockTransaction, StockTransactionType, StockSettings } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import { useUser } from './use-user';
import { v4 as uuidv4 } from 'uuid';

interface StockContextType {
  stockItems: StockItem[];
  optimisticItems: StockItem[];
  transactions: StockTransaction[];
  stockSettings: StockSettings | null;
  loading: boolean;
  addStockItem: (item: Omit<StockItem, 'id' | 'currentQuantity' | 'lastUpdated'>) => Promise<string | undefined>;
  adjustStock: (params: { itemId: string; type: StockTransactionType; quantity: number; reason: string; orderId?: string }) => Promise<void>;
  deleteStockItem: (itemId: string) => Promise<void>;
  getItemById: (id: string) => StockItem | undefined;
  updateStockSettings: (settings: StockSettings) => Promise<void>;
}

const StockContext = createContext<StockContextType | undefined>(undefined);

export function StockProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { toast } = useToast();
  const [isSecondaryAuthReady, setIsSecondaryAuthReady] = useState(false);

  useEffect(() => {
    ensureSecondaryAuth().then(() => setIsSecondaryAuthReady(true));
  }, []);

  const firestore = useMemo(() => getSecondaryFirestore(), []);

  const stockRef = useMemo(() => isSecondaryAuthReady ? collection(firestore, 'stock') : null, [firestore, isSecondaryAuthReady]);
  const { data: stockItems, isLoading: itemsLoading } = useCollection<StockItem>(stockRef as any);

  const transactionsRef = useMemo(() => 
    isSecondaryAuthReady ? query(collection(firestore, 'stockTransactions'), orderBy('timestamp', 'desc')) : null, 
    [firestore, isSecondaryAuthReady]
  );
  const { data: transactions, isLoading: txLoading } = useCollection<StockTransaction>(transactionsRef as any);

  const settingsDocRef = useMemo(() => isSecondaryAuthReady ? doc(firestore, 'settings', 'stock') : null, [firestore, isSecondaryAuthReady]);
  const { data: stockSettings, isLoading: settingsLoading } = useDoc<StockSettings>(settingsDocRef as any);

  // Optimistic UI for stock quantities
  const [optimisticItems, addOptimisticAdjustment] = useOptimistic(
    stockItems || [],
    (state, adjustment: { itemId: string, change: number }) => {
        return state.map(item => 
            item.id === adjustment.itemId 
            ? { ...item, currentQuantity: item.currentQuantity + adjustment.change }
            : item
        );
    }
  );

  const updateStockSettings = useCallback(async (newSettings: StockSettings) => {
    if (!settingsDocRef) return;
    try {
      await setDoc(settingsDocRef, newSettings, { merge: true });
    } catch (error) {
      console.error("Error updating stock settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update categories." });
    }
  }, [settingsDocRef, toast]);

  const addStockItem = useCallback(async (itemData: Omit<StockItem, 'id' | 'currentQuantity' | 'lastUpdated'>) => {
    try {
      const newItemRef = doc(collection(firestore, 'stock'));
      const newItem: StockItem = {
        ...itemData,
        id: newItemRef.id,
        currentQuantity: 0,
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
    
    // Trigger optimistic update
    const qtyChange = type === 'In' ? quantity : -quantity;
    addOptimisticAdjustment({ itemId, change: qtyChange });

    try {
      const txId = uuidv4();
      const txRef = doc(firestore, 'stockTransactions', txId);
      const itemRef = doc(firestore, 'stock', itemId);

      const transaction: StockTransaction = {
        id: txId,
        itemId,
        type,
        quantity,
        reason,
        orderId: orderId || 'none',
        timestamp: serverTimestamp(),
        userId: user.id,
        userName: user.name || 'Unknown User',
      };
      
      await setDoc(txRef, transaction);
      await updateDoc(itemRef, {
        currentQuantity: increment(qtyChange),
        lastUpdated: serverTimestamp(),
      });

      toast({ 
        title: type === 'In' ? "Stock Added" : "Stock Used", 
        description: `${quantity} units recorded.` 
      });
    } catch (error) {
      console.error("Error adjusting stock:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to record stock adjustment." });
    }
  }, [firestore, user, toast, addOptimisticAdjustment]);

  const deleteStockItem = useCallback(async (itemId: string) => {
    try {
      await deleteDoc(doc(firestore, 'stock', itemId));
      toast({ title: "Item Deleted", description: "Inventory item removed." });
    } catch (error) {
      console.error("Error deleting stock item:", error);
    }
  }, [firestore, toast]);

  const getItemById = useCallback((id: string) => {
    return stockItems?.find(item => item.id === id);
  }, [stockItems]);

  // Seed default categories if none exist
  useEffect(() => {
    if (isSecondaryAuthReady && !settingsLoading && !stockSettings) {
      updateStockSettings({
        categories: ['Hardware', 'Material', 'Supplies', 'Paint', 'Fabric', 'Glue']
      });
    }
  }, [isSecondaryAuthReady, settingsLoading, stockSettings, updateStockSettings]);

  const value = useMemo(() => ({
    stockItems: stockItems || [],
    optimisticItems,
    transactions: transactions || [],
    stockSettings: stockSettings || null,
    loading: !isSecondaryAuthReady || itemsLoading || txLoading || settingsLoading,
    addStockItem,
    adjustStock,
    deleteStockItem,
    getItemById,
    updateStockSettings,
  }), [stockItems, optimisticItems, transactions, stockSettings, isSecondaryAuthReady, itemsLoading, txLoading, settingsLoading, addStockItem, adjustStock, deleteStockItem, getItemById, updateStockSettings]);

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
