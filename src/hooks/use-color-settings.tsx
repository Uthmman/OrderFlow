'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useEffect, useRef } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import type { ColorSettings } from '@/lib/types';

interface ColorSettingsContextType {
  settings: ColorSettings | null;
  loading: boolean;
  updateSettings: (newSettings: ColorSettings) => Promise<void>;
}

const ColorSettingsContext = createContext<ColorSettingsContextType | undefined>(undefined);

const INITIAL_COLOR_SETTINGS: ColorSettings = {
    woodFinishes: [
        { name: 'Natural Wood', imageUrl: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=200&h=200&fit=crop' },
        { name: 'White Oak', imageUrl: 'https://images.unsplash.com/photo-1618221049213-9e6b2975ef74?w=200&h=200&fit=crop' },
        { name: 'Black Walnut', imageUrl: 'https://images.unsplash.com/photo-1594957288072-9782415b3a98?w=200&h=200&fit=crop' },
    ],
    customColors: [
        { name: 'Crimson Red', colorValue: '#DC2626' },
        { name: 'Sapphire Blue', colorValue: '#2563EB' },
        { name: 'Emerald Green', colorValue: '#059669' },
    ],
};

export function ColorSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const hasSeeded = useRef(false);

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'colors'), [firestore]);
  const { data: dbSettings, isLoading: loading } = useDoc<ColorSettings>(settingsDocRef);

  // Merge DB settings with defaults in UI, but don't force write back unless user saves
  const settings = dbSettings || (loading ? null : INITIAL_COLOR_SETTINGS);

  const updateSettings = useCallback(async (newSettings: ColorSettings) => {
    try {
        await setDoc(settingsDocRef, newSettings);
        toast({
            title: "Settings Updated",
            description: "Your color palette has been saved.",
        });
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not save color settings.",
        });
    }
  }, [settingsDocRef, toast]);

  const value = useMemo(() => ({
    settings,
    loading,
    updateSettings,
  }), [settings, loading, updateSettings]);

  return (
    <ColorSettingsContext.Provider value={value}>
      {children}
    </ColorSettingsContext.Provider>
  );
}

export function useColorSettings() {
  const context = useContext(ColorSettingsContext);
  if (context === undefined) {
    throw new Error('useColorSettings must be used within a ColorSettingProvider');
  }
  return context;
}
