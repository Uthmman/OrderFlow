

'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { collection, doc, addDoc, updateDoc, setDoc, serverTimestamp, query, where, getDocs, writeBatch, arrayUnion, deleteDoc } from 'firebase/firestore';
import type { Order, Product } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from './use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { v4 as uuidv4 } from 'uuid';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Partial<Product>) => Promise<string | undefined>;
  updateProduct: (productId: string, productData: Partial<Product>) => Promise<void>;
  deleteProducts: (productsToDelete: Product[]) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  syncProductsFromOrders: (orders: Order[]) => Promise<number>;
  addOrderIdToProduct: (productId: string, orderId: string) => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Helper function to remove undefined values from an object, which Firestore doesn't like.
const removeUndefined = (obj: any): any => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
  }

  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        newObj[key] = removeUndefined(value);
      }
    }
  }
  return newObj;
};


export function ProductProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const productsRef = useMemoFirebase(() => collection(firestore, 'products'), [firestore]);
  const { data: products, isLoading: loading } = useCollection<Product>(productsRef);

  const addProduct = useCallback(async (productData: Partial<Product>) => {
    try {
      const newProductRef = doc(collection(firestore, "products"));
      const newProduct: Product = {
        id: newProductRef.id,
        productName: productData.productName || 'Unnamed Product',
        category: productData.category || 'Uncategorized',
        description: productData.description || '',
        price: productData.price || 0,
        attachments: productData.attachments || [],
        designAttachments: productData.designAttachments || [],
        colors: productData.colors || [],
        material: productData.material || [],
        dimensions: productData.dimensions,
        orderIds: productData.orderIds || [],
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
      const cleanData = removeUndefined(productData);
      updateDocumentNonBlocking(productRef, cleanData);
    } catch (error) {
       console.error("Error updating product: ", error);
       toast({
        variant: "destructive",
        title: "Failed to update product",
        description: (error as Error).message,
      });
    }
  }, [firestore, toast]);
  
  const addOrderIdToProduct = useCallback(async (productId: string, orderId: string) => {
    const productRef = doc(firestore, 'products', productId);
    try {
        // Use set with merge to create the document if it doesn't exist, or update it if it does.
        await setDoc(productRef, {
            orderIds: arrayUnion(orderId)
        }, { merge: true });
    } catch (error) {
        console.error(`Failed to add orderId to product ${productId}:`, error);
    }
  }, [firestore]);
  
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
            orderIds: [order.id],
          };
          
          const cleanProduct = removeUndefined(newProduct);
          batch.set(newProductRef, cleanProduct);

          existingProductNames.add(orderProduct.productName);
          newProductsCount++;
        }
      }
    }

    if (newProductsCount > 0) {
      await batch.commit();
    }

    return newProductsCount;
  }, [firestore, products]);
  
  const deleteProducts = useCallback(async (productsToDelete: Product[]) => {
    const batch = writeBatch(firestore);
    productsToDelete.forEach(product => {
        const productRef = doc(firestore, 'products', product.id);
        batch.delete(productRef);
    });
    await batch.commit();
  }, [firestore]);


  const value = useMemo(() => ({
    products: products || [],
    loading,
    addProduct,
    updateProduct,
    deleteProducts,
    getProductById,
    syncProductsFromOrders,
    addOrderIdToProduct,
  }), [products, loading, addProduct, updateProduct, deleteProducts, getProductById, syncProductsFromOrders, addOrderIdToProduct]);

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
