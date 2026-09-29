
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
import { startOfWeek, format } from 'date-fns';

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
    // Group secondary expenses by week
    const groupedSecondary = secondaryRecords.reduce((acc, curr) => {
      const date = curr.timestamp?.seconds ? new Date(curr.timestamp.seconds * 1000) : (curr.date ? new Date(curr.date) : new Date());
      const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start week on Monday
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const category = curr.category || 'Salary';
      const groupKey = `grouped-${category}-${weekKey}`;
      
      if (!acc[groupKey]) {
        acc[groupKey] = {
          id: groupKey,
          description: `${category} - Week of ${format(weekStart, 'MMM d, yyyy')}`,
          amount: 0,
          date: weekStart,
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
