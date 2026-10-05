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
  updateCategory: (index: number, category: ProductCategory) => Promise<void>;
  deleteCategory: (index: number) => Promise<void>;
  addMaterial: (newMaterial: Material) => Promise<void>;
  updateMaterial: (index: number, material: Material) => Promise<void>;
  deleteMaterial: (index: number) => Promise<void>;
}

const ProductSettingsContext = createContext<ProductSettingsContextType | undefined>(undefined);

const INITIAL_PRODUCT_SETTINGS: ProductSettings = {
    productCategories: [
        { name: "Sofa", icon: "Sofa" },
        { name: "Bed", icon: "Bed" },
        { name: "Wardrobe", icon: "Wardrobe" },
        { name: "Door", icon: "DoorOpen" },
    ],
    materials: [
        { name: 'MDF Paint', icon: 'PaintBucket' },
        { name: 'Oak', icon: 'Leaf' },
        { name: 'Laminated MDF', icon: 'Sheet' },
    ]
};

export function ProductSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'products'), [firestore]);
  const { data: dbSettings, isLoading: loading } = useDoc<ProductSettings>(settingsDocRef);

  const productSettings = dbSettings || (loading ? null : INITIAL_PRODUCT_SETTINGS);

  const updateProductSettings = useCallback(async (newSettings: ProductSettings) => {
    try {
        await setDoc(settingsDocRef, newSettings);
        toast({
          title: "Settings Updated",
          description: "Your product settings have been saved.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "There was a problem saving your settings.",
        });
    }
  }, [settingsDocRef, toast]);

  const addCategory = useCallback(async (newCategory: ProductCategory) => {
    const current = productSettings || { productCategories: [], materials: [] };
    const updatedCategories = [...(current.productCategories || []), newCategory];
    await updateProductSettings({ ...current, productCategories: updatedCategories });
  }, [productSettings, updateProductSettings]);

  const updateCategory = useCallback(async (index: number, updatedCategory: ProductCategory) => {
    if (!productSettings) return;
    const updatedCategories = [...productSettings.productCategories];
    updatedCategories[index] = updatedCategory;
    await updateProductSettings({ ...productSettings, productCategories: updatedCategories });
  }, [productSettings, updateProductSettings]);

  const deleteCategory = useCallback(async (index: number) => {
    if (!productSettings) return;
    const updatedCategories = productSettings.productCategories.filter((_, i) => i !== index);
    await updateProductSettings({ ...productSettings, productCategories: updatedCategories });
  }, [productSettings, updateProductSettings]);
  
  const addMaterial = useCallback(async (newMaterial: Material) => {
    const current = productSettings || { productCategories: [], materials: [] };
    const updatedMaterials = [...(current.materials || []), newMaterial];
    await updateProductSettings({ ...current, materials: updatedMaterials });
  }, [productSettings, updateProductSettings]);

  const updateMaterial = useCallback(async (index: number, updatedMaterial: Material) => {
    if (!productSettings) return;
    const updatedMaterials = [...productSettings.materials];
    updatedMaterials[index] = updatedMaterial;
    await updateProductSettings({ ...productSettings, materials: updatedMaterials });
  }, [productSettings, updateProductSettings]);

  const deleteMaterial = useCallback(async (index: number) => {
      if (!productSettings) return;
      const updatedMaterials = productSettings.materials.filter((_, i) => i !== index);
      await updateProductSettings({ ...productSettings, materials: updatedMaterials });
  }, [productSettings, updateProductSettings]);

  const value = useMemo(() => ({
    productSettings,
    loading,
    updateProductSettings,
    addCategory,
    updateCategory,
    deleteCategory,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  }), [productSettings, loading, updateProductSettings, addCategory, updateCategory, deleteCategory, addMaterial, updateMaterial, deleteMaterial]);

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
