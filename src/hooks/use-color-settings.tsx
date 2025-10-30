
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { ColorSettings } from '@/lib/types';


interface ColorSettingsContextType {
  settings: ColorSettings | null;
  loading: boolean;
  updateSettings: (newSettings: ColorSettings) => void;
}

const ColorSettingsContext = createContext<ColorSettingsContextType | undefined>(undefined);

export function ColorSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'colors'), [firestore]);
  const { data: settings, isLoading: loading } = useDoc<ColorSettings>(settingsDocRef);

  const updateSettings = useCallback((newSettings: ColorSettings) => {
    setDocumentNonBlocking(settingsDocRef, newSettings, { merge: true });
    toast({
      title: "Settings Updated",
      description: "Your color palette has been saved.",
    });
  }, [settingsDocRef, toast]);
  
  // Seed initial data if it doesn't exist
  React.useEffect(() => {
    if (!loading && !settings) {
        const initialSettings: ColorSettings = {
            woodFinishes: [
                { name: 'Natural Wood', imageUrl: 'https://images.unsplash.com/photo-1616047006789-b7af5afb8c20?w=200&h=200&fit=crop' },
                { name: 'White Oak', imageUrl: 'https://images.unsplash.com/photo-1618221049213-9e6b2975ef74?w=200&h=200&fit=crop' },
                { name: 'Black Walnut', imageUrl: 'https://images.unsplash.com/photo-1594957288072-9782415b3a98?w=200&h=200&fit=crop' },
                { name: 'Cherry', imageUrl: 'https://images.unsplash.com/photo-1631049298516-b106f3458e65?w=200&h=200&fit=crop' },
                { name: 'Matte Black', imageUrl: 'https://images.unsplash.com/photo-1588796144855-f25b39415555?w=200&h=200&fit=crop' },
                { name: 'Glossy White', imageUrl: 'https://images.unsplash.com/photo-1611105948924-d25a2ba35c24?w=200&h=200&fit=crop' },
            ],
            customColors: [
                { name: 'Crimson Red', colorValue: '#DC2626' },
                { name: 'Sapphire Blue', colorValue: '#2563EB' },
                { name: 'Emerald Green', colorValue: '#059669' },
                { name: 'Sunshine Yellow', colorValue: '#F59E0B' },
                { name: 'Royal Purple', colorValue: '#7C3AED' },
                { name: 'Tangerine Orange', colorValue: '#F97316' },
                { name: 'Hot Pink', colorValue: '#EC4899' },
                { name: 'Charcoal Gray', colorValue: '#4B5563' },
            ],
        };
        setDoc(settingsDocRef, initialSettings);
    }
  }, [loading, settings, settingsDocRef]);

  const value = useMemo(() => ({
    settings: settings,
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
