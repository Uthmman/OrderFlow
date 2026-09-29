
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { collection, doc, deleteDoc, updateDoc, setDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Expense, OrderAttachment, ExpenseDetail } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from './use-toast';
import { useUser } from './use-user';
import { v4 as uuidv4 } from 'uuid';
import { deleteFileFlow } from '@/ai/flows/backblaze-flow';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';

/**
 * Simplified Ethiopian Month Calculation for grouping.
 * Meskerem 1 usually falls on Sept 11 (or 12 in leap years).
 */
const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

function getEthiopianPeriod(date: Date) {
  const month = date.getMonth();
  const day = date.getDate();
  let year = date.getFullYear() - 8;
  let ethMonthIndex = 0;

  // Rough estimation of Ethiopian months for grouping purposes
  if (month === 8) ethMonthIndex = day >= 11 ? 0 : 11;
  else if (month === 9) ethMonthIndex = day >= 11 ? 1 : 0;
  else if (month === 10) ethMonthIndex = day >= 10 ? 2 : 1;
  else if (month === 11) ethMonthIndex = day >= 10 ? 3 : 2;
  else if (month === 0) ethMonthIndex = day >= 9 ? 4 : 3;
  else if (month === 1) ethMonthIndex = day >= 8 ? 5 : 4;
  else if (month === 2) ethMonthIndex = day >= 10 ? 6 : 5;
  else if (month === 3) ethMonthIndex = day >= 9 ? 7 : 6;
  else if (month === 4) ethMonthIndex = day >= 9 ? 8 : 7;
  else if (month === 5) ethMonthIndex = day >= 8 ? 9 : 8;
  else if (month === 6) ethMonthIndex = day >= 8 ? 10 : 9;
  else if (month === 7) ethMonthIndex = day >= 7 ? 11 : 10;
  
  if (month > 8 || (month === 8 && day >= 11)) year = date.getFullYear() - 7;
  
  return `${ETHIOPIAN_MONTHS[ethMonthIndex]} ${year}`;
}

interface ExpenseContextType {
  expenses: Expense[];
  loading: boolean;
  addExpense: (expense: Omit<Expense, 'id' | 'ownerId'>) => Promise<string | undefined>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (expense: Expense) => Promise<void>;
}

const ExpenseContext = createContext<ExpenseContextType | undefined>(undefined);

export function ExpenseProvider({ children }: { children: ReactNode }) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();

  const expensesRef = useMemoFirebase(() => query(collection(firestore, 'expenses'), orderBy('date', 'desc')), [firestore]);
  const { data: primaryExpenses, isLoading: primaryLoading } = useCollection<Expense>(expensesRef);

  const [secondaryRecords, setSecondaryRecords] = useState<any[]>([]);
  const [secondaryLoading, setSecondaryLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: () => void;

    const fetchSecondary = async () => {
      try {
        await ensureSecondaryAuth();
        const db = getSecondaryFirestore();
        const q = query(collection(db, 'employeeExpenses'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSecondaryRecords(results);
          setSecondaryLoading(false);
        }, (error) => {
          console.error("Secondary expenses error:", error);
          setSecondaryLoading(false);
        });
      } catch (err) {
        console.error("Failed to initialize secondary expenses:", err);
        setSecondaryLoading(false);
      }
    };

    fetchSecondary();
    return () => unsubscribe?.();
  }, []);

  const combinedExpenses = useMemo(() => {
    // Group secondary expenses by Ethiopian Month + Year
    const groupedSecondary = secondaryRecords.reduce((acc, curr) => {
      const date = curr.timestamp?.seconds ? new Date(curr.timestamp.seconds * 1000) : (curr.date ? new Date(curr.date) : new Date());
      const periodLabel = getEthiopianPeriod(date);
      const category = curr.category || 'Salary';
      const groupKey = `grouped-${category}-${periodLabel}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          id: groupKey,
          description: `${category} Group - ${periodLabel}`,
          amount: 0,
          date: date, // Representative date
          category: category,
          paidTo: 'Multiple Employees',
          status: 'Paid',
          hasReceipt: true,
          ownerId: 'system',
          isSecondary: true,
          details: []
        };
      }
      
      acc[groupKey].amount += curr.amount || 0;
      acc[groupKey].details?.push({
        id: curr.id,
        name: curr.employeeName || 'Staff Member',
        amount: curr.amount || 0,
        date: date
      });
      
      return acc;
    }, {} as Record<string, Expense>);

    const finalSecondary = Object.values(groupedSecondary);
    const combined = [...(primaryExpenses || []), ...finalSecondary];

    return combined.sort((a, b) => {
        const dateA = a.date?.seconds ? a.date.seconds * 1000 : new Date(a.date).getTime();
        const dateB = b.date?.seconds ? b.date.seconds * 1000 : new Date(b.date).getTime();
        return dateB - dateA;
    });
  }, [primaryExpenses, secondaryRecords]);

  const addExpense = useCallback(async (expenseData: Omit<Expense, 'id' | 'ownerId'>) => {
    if (!user) return;
    try {
      const newId = uuidv4();
      const ref = doc(firestore, 'expenses', newId);
      const newExpense: Expense = {
        ...expenseData,
        id: newId,
        ownerId: user.id,
      };
      await setDoc(ref, newExpense);
      toast({ title: "Expense Added", description: "The expenditure has been recorded." });
      return newId;
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save expense." });
    }
  }, [firestore, user, toast]);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    try {
      const ref = doc(firestore, 'expenses', id);
      await updateDoc(ref, data);
      toast({ title: "Expense Updated" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Update failed." });
    }
  }, [firestore, toast]);

  const deleteExpense = useCallback(async (expense: Expense) => {
    if (expense.isSecondary) {
        toast({ variant: "destructive", title: "Action Denied", description: "System expenses must be managed in the Payroll system." });
        return;
    }
    try {
      if (expense.receiptAttachment?.storagePath) {
        await deleteFileFlow({ fileName: expense.receiptAttachment.storagePath });
      }
      await deleteDoc(doc(firestore, 'expenses', expense.id));
      toast({ title: "Expense Deleted" });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Deletion failed." });
    }
  }, [firestore, toast]);

  const value = useMemo(() => ({
    expenses: combinedExpenses,
    loading: primaryLoading || secondaryLoading,
    addExpense,
    updateExpense,
    deleteExpense,
  }), [combinedExpenses, primaryLoading, secondaryLoading, addExpense, updateExpense, deleteExpense]);

  return (
    <ExpenseContext.Provider value={value}>
      {children}
    </ExpenseContext.Provider>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
}
