
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import { setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ProductSettings, ProductCategory } from '@/lib/types';
import { generateIcon } from '@/ai/flows/icon-flow';


interface ProductSettingsContextType {
  productSettings: ProductSettings | null;
  loading: boolean;
  updateProductSettings: (newSettings: ProductSettings) => void;
  addCategory: (newCategory: ProductCategory) => Promise<void>;
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
      description: "Your product categories have been saved.",
    });
  }, [settingsDocRef, toast]);

  const addCategory = useCallback(async (newCategory: ProductCategory) => {
    if (!productSettings) return;

    let finalCategory = { ...newCategory };

    // If the icon is a default placeholder and a name exists, generate an AI icon
    if (finalCategory.icon === 'Box' && finalCategory.name) {
      try {
        const result = await generateIcon({ categoryName: finalCategory.name });
        finalCategory.icon = result.iconDataUri;
      } catch (error) {
        console.error("Icon generation failed for new category, falling back to default.", error);
        // Toast is handled in the UI, just log here
      }
    }
    
    const updatedCategories = [...productSettings.productCategories, finalCategory];
    updateDocumentNonBlocking(settingsDocRef, { productCategories: updatedCategories });
    
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
  }), [productSettings, loading, updateProductSettings, addCategory]);

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
