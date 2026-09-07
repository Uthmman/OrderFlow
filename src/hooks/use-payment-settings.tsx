
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useDoc } from '@/firebase/firestore/use-doc';
import { useToast } from './use-toast';
import type { PaymentSettings, BankAccount } from '@/lib/types';

interface PaymentSettingsContextType {
  settings: PaymentSettings | null;
  loading: boolean;
  updateSettings: (newSettings: PaymentSettings) => Promise<void>;
  addMethod: (method: string) => Promise<void>;
  deleteMethod: (method: string) => Promise<void>;
  addBank: (bank: BankAccount) => Promise<void>;
  deleteBank: (bankId: string) => Promise<void>;
}

const PaymentSettingsContext = createContext<PaymentSettingsContextType | undefined>(undefined);

export function PaymentSettingProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { toast } = useToast();

  const settingsDocRef = useMemoFirebase(() => doc(firestore, 'settings', 'payments'), [firestore]);
  const { data: settings, isLoading: loading } = useDoc<PaymentSettings>(settingsDocRef);

  const updateSettings = useCallback(async (newSettings: PaymentSettings) => {
    try {
        await setDoc(settingsDocRef, newSettings, { merge: true });
        toast({ title: "Settings Updated", description: "Payment settings saved." });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Failed to save settings." });
    }
  }, [settingsDocRef, toast]);

  const addMethod = useCallback(async (method: string) => {
    if (!settings) return;
    if (settings.methods.includes(method)) return;
    await updateSettings({ ...settings, methods: [...settings.methods, method] });
  }, [settings, updateSettings]);

  const deleteMethod = useCallback(async (method: string) => {
    if (!settings) return;
    await updateSettings({ ...settings, methods: settings.methods.filter(m => m !== method) });
  }, [settings, updateSettings]);

  const addBank = useCallback(async (bank: BankAccount) => {
    if (!settings) return;
    await updateSettings({ ...settings, banks: [...settings.banks, bank] });
  }, [settings, updateSettings]);

  const deleteBank = useCallback(async (bankId: string) => {
    if (!settings) return;
    await updateSettings({ ...settings, banks: settings.banks.filter(b => b.id !== bankId) });
  }, [settings, updateSettings]);

  // Seed initial data
  React.useEffect(() => {
    if (!loading && !settings) {
        const initialSettings: PaymentSettings = {
            methods: ['Cash', 'Bank Transfer', 'Cheque', 'Other'],
            banks: [
                { id: '1', bankName: 'Commercial Bank of Ethiopia', accountNumber: '' },
                { id: '2', bankName: 'Awash Bank', accountNumber: '' },
                { id: '3', bankName: 'Abyssinia Bank', accountNumber: '' }
            ]
        };
        setDoc(settingsDocRef, initialSettings);
    }
  }, [loading, settings, settingsDocRef]);

  const value = useMemo(() => ({
    settings,
    loading,
    updateSettings,
    addMethod,
    deleteMethod,
    addBank,
    deleteBank
  }), [settings, loading, updateSettings, addMethod, deleteMethod, addBank, deleteBank]);

  return (
    <PaymentSettingsContext.Provider value={value}>
      {children}
    </PaymentSettingsContext.Provider>
  );
}

export function usePaymentSettings() {
  const context = useContext(PaymentSettingsContext);
  if (context === undefined) {
    throw new Error('usePaymentSettings must be used within a PaymentSettingProvider');
  }
  return context;
}
