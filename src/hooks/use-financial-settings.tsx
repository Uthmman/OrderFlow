
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import type { FinancialSettings, Shareholder } from '@/lib/types';

interface FinancialSettingsContextType {
  settings: FinancialSettings | null;
  loading: boolean;
  updateShareholders: (shareholders: Shareholder[]) => Promise<void>;
}

const FinancialSettingsContext = createContext<FinancialSettingsContextType | undefined>(undefined);

export function FinancialSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'financials'), [firestore]);
  const { data: settings, isLoading: loading } = useDoc<FinancialSettings>(settingsDocRef);

  const updateShareholders = useCallback(async (shareholders: Shareholder[]) => {
    try {
        await setDoc(settingsDocRef, { shareholders }, { merge: true });
        toast({ title: "Distribution Updated", description: "Shareholder percentages saved." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    }
  }, [settingsDocRef, toast]);

  const value = useMemo(() => ({
    settings: settings || { shareholders: [] },
    loading,
    updateShareholders,
  }), [settings, loading, updateShareholders]);

  return (
    <FinancialSettingsContext.Provider value={value}>
      {children}
    </FinancialSettingsContext.Provider>
  );
}

export function useFinancialSettings() {
  const context = useContext(FinancialSettingsContext);
  if (context === undefined) {
    throw new Error('useFinancialSettings must be used within a FinancialSettingProvider');
  }
  return context;
}
