
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import type { BrandSettings } from '@/lib/types';

interface BrandSettingsContextType {
  settings: BrandSettings | null;
  loading: boolean;
  updateSettings: (newSettings: BrandSettings) => Promise<void>;
}

const BrandSettingsContext = createContext<BrandSettingsContextType | undefined>(undefined);

export function BrandSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'branding'), [firestore]);
  const { data: settings, isLoading: loading } = useDoc<BrandSettings>(settingsDocRef);

  const updateSettings = useCallback(async (newSettings: BrandSettings) => {
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        toast({ title: "Settings Updated", description: "Branding settings saved." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save branding." });
    }
  }, [settingsDocRef, toast]);

  const value = useMemo(() => ({
    settings,
    loading,
    updateSettings,
  }), [settings, loading, updateSettings]);

  return (
    <BrandSettingsContext.Provider value={value}>
      {children}
    </BrandSettingsContext.Provider>
  );
}

export function useBrandSettings() {
  const context = useContext(BrandSettingsContext);
  if (context === undefined) {
    throw new Error('useBrandSettings must be used within a BrandSettingProvider');
  }
  return context;
}
