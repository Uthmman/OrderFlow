
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ProductSettings, ProductCategory, Material } from '@/lib/types';


interface ProductSettingsContextType {
  productSettings: ProductSettings | null;
  loading: boolean;
  updateProductSettings: (newSettings: ProductSettings) => void;
  addCategory: (newCategory: ProductCategory) => Promise<void>;
  addMaterial: (newMaterial: Material) => Promise<void>;
}

const ProductSettingsContext = createContext<ProductSettingsContextType | undefined>(undefined);

export function ProductSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'products'), [firestore]);
  const { data: productSettings, isLoading: loading } = useDoc<ProductSettings>(settingsDocRef);

  const updateProductSettings = useCallback((newSettings: ProductSettings) => {
    setDocumentNonBlocking(settingsDocRef, newSettings, { merge: true });
    toast({
      title: "Settings Updated",
      description: "Your product settings have been saved.",
    });
  }, [settingsDocRef, toast]);

  const addCategory = useCallback(async (newCategory: ProductCategory) => {
    if (!productSettings) return;
    
    const updatedCategories = [...productSettings.productCategories, newCategory];
    setDocumentNonBlocking(settingsDocRef, { productCategories: updatedCategories }, { merge: true });
    
  }, [productSettings, settingsDocRef]);
  
  const addMaterial = useCallback(async (newMaterial: Material) => {
    if (!productSettings) return;

    const updatedMaterials = [...productSettings.materials, newMaterial];
    setDocumentNonBlocking(settingsDocRef, { materials: updatedMaterials }, { merge: true });
  }, [productSettings, settingsDocRef]);
  
  // Seed initial data if it doesn't exist
  React.useEffect(() => {
    if (!loading && !productSettings) {
        const initialSettings: ProductSettings = {
            productCategories: [
                { name: "Bunk Bed", icon: "BedDouble" },
                { name: "Bed 150", icon: "Bed" },
                { name: "Bed 120", icon: "Bed" },
                { name: "Bed 180", icon: "Bed" },
                { name: "Bed 200", icon: "Bed" },
                { name: "Single Bed", icon: "BedSingle" },
                { name: "Baby Bed", icon: "Baby" },
                { name: "Wardrobe", icon: "Wardrobe" },
                { name: "Kitchen Cabinet", icon: "ChefHat" },
                { name: "TV Stand", icon: "Tv" },
                { name: "Sofa", icon: "Sofa" },
                { name: "Door", icon: "DoorOpen" },
                { name: "Main Door", icon: "DoorClosed" },
                { name: "Dressing Table", icon: "Square" },
                { name: "Study Table", icon: "Book" },
                { name: "Office Table", icon: "Briefcase" },
                { name: "Dining Table", icon: "Utensils" },
                { name: "Book Shelf", icon: "BookOpen" },
            ],
            materials: [
                { name: 'MDF Paint' },
                { name: 'MDF Paint 2K' },
                { name: 'Oak' },
                { name: 'Oak 2K' },
                { name: 'Australian Wood' },
                { name: 'UV MDF' },
                { name: 'Blockboard UV MDF' },
                { name: 'Laminated MDF' },
                { name: 'Blockboard Laminated MDF' },
            ]
        };
        setDoc(settingsDocRef, initialSettings);
    }
  }, [loading, productSettings, settingsDocRef]);

  const value = useMemo(() => ({
    productSettings: productSettings,
    loading,
    updateProductSettings,
    addCategory,
    addMaterial
  }), [productSettings, loading, updateProductSettings, addCategory, addMaterial]);

  return (
    <ProductSettingsContext.Provider value={value}>
      {children}
    </ProductSettingsContext.Provider>
  );
}

export function useProductSettings() {
  const context = useContext(ProductSettingsContext);
  if (context === undefined) {
    throw new Error('useProductSettings must be used within a ProductSettingProvider');
  }
  return context;
}

    