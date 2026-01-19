
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import type { ProductSettings, ProductCategory, Material } from '@/lib/types';


interface ProductSettingsContextType {
  productSettings: ProductSettings | null;
  loading: boolean;
  updateProductSettings: (newSettings: ProductSettings) => Promise<void>;
  addCategory: (newCategory: ProductCategory) => Promise<void>;
  addMaterial: (newMaterial: Material) => Promise<void>;
}

const ProductSettingsContext = createContext<ProductSettingsContextType | undefined>(undefined);

export function ProductSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'products'), [firestore]);
  const { data: productSettings, isLoading: loading } = useDoc<ProductSettings>(settingsDocRef);

  const updateProductSettings = useCallback(async (newSettings: ProductSettings) => {
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        toast({
          title: "Settings Updated",
          description: "Your product settings have been saved.",
        });
    } catch (error) {
        console.error("Failed to update product settings:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "There was a problem saving your settings.",
        });
    }
  }, [settingsDocRef, toast]);

  const addCategory = useCallback(async (newCategory: ProductCategory) => {
    if (!productSettings) return;
    
    const updatedCategories = [...productSettings.productCategories, newCategory];
    await updateProductSettings({ ...productSettings, productCategories: updatedCategories });
    
  }, [productSettings, updateProductSettings]);
  
  const addMaterial = useCallback(async (newMaterial: Material) => {
    if (!productSettings) return;

    const updatedMaterials = [...productSettings.materials, newMaterial];
    await updateProductSettings({ ...productSettings, materials: updatedMaterials });
  }, [productSettings, updateProductSettings]);
  
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
                { name: 'MDF Paint', icon: 'PaintBucket' },
                { name: 'MDF Paint 2K', icon: 'Paintbrush' },
                { name: 'Oak', icon: 'Leaf' },
                { name: 'Oak 2K', icon: 'TreeDeciduous' },
                { name: 'Australian Wood', icon: 'Sprout' },
                { name: 'UV MDF', icon: 'Sun' },
                { name: 'Blockboard UV MDF', icon: 'Layers' },
                { name: 'Laminated MDF', icon: 'Sheet' },
                { name: 'Blockboard Laminated MDF', icon: 'Library' },
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
