
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, setDoc, serverTimestamp, query, where, getDocs, writeBatch } from 'firebase/firestore';
import type { Order, Product } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from './use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { v4 as uuidv4 } from 'uuid';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<string | undefined>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  syncProductsFromOrders: (orders: Order[]) => Promise<number>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const productsRef = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading: loading } = useCollection<Product>(productsRef);

  const addProduct = useCallback(async (productData: Omit<Product, 'id'>) => {
    try {
      const newProductRef = doc(collection(firestore, "products"));
      const newProduct = {
        ...productData,
        id: newProductRef.id,
        creationDate: serverTimestamp(),
      };
      await setDoc(newProductRef, newProduct);
      return newProductRef.id;
    } catch (error) {
      console.error("Error adding product: ", error);
      toast({
        variant: "destructive",
        title: "Failed to create product",
        description: (error as Error).message,
      });
      return undefined;
    }
  }, [firestore, toast]);

  const updateProduct = useCallback(async (productId: string, productData: Partial<Product>) => {
    const productRef = doc(firestore, 'products', productId);
    try {
      updateDocumentNonBlocking(productRef, productData);
    } catch (error) {
       console.error("Error updating product: ", error);
       toast({
        variant: "destructive",
        title: "Failed to update product",
        description: (error as Error).message,
      });
    }
  }, [firestore, toast]);
  
  const getProductById = useCallback((id: string) => {
    return products?.find(p => p.id === id);
  }, [products]);

  const syncProductsFromOrders = useCallback(async (orders: Order[]): Promise<number> => {
    if (!orders || orders.length === 0) return 0;

    const existingProductNames = new Set(products?.map(p => p.productName) || []);
    const batch = writeBatch(firestore);
    let newProductsCount = 0;

    for (const order of orders) {
      for (const orderProduct of (order.products || [])) {
        if (orderProduct.productName && !existingProductNames.has(orderProduct.productName)) {
          const newProductRef = doc(collection(firestore, "products"));
          const newProduct: Product = {
            ...orderProduct,
            id: newProductRef.id,
          };
          batch.set(newProductRef, newProduct);
          existingProductNames.add(orderProduct.productName); // Avoid adding duplicates from the same sync batch
          newProductsCount++;
        }
      }
    }

    if (newProductsCount > 0) {
      await batch.commit();
    }

    return newProductsCount;
  }, [firestore, products]);


  const value = useMemo(() => ({
    products: products || [],
    loading,
    addProduct,
    updateProduct,
    getProductById,
    syncProductsFromOrders,
  }), [products, loading, addProduct, updateProduct, getProductById, syncProductsFromOrders]);

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
