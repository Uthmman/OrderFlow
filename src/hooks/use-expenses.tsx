
'use client';

import React, { createContext, useContext, ReactNode, useMemo, useCallback, useState, useEffect } from 'react';
import { collection, doc, deleteDoc, updateDoc, setDoc, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import type { Expense, OrderAttachment, ExpenseDetail } from '@/lib/types';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirebase, useMemoFirebase } from '@/firebase/provider';
import { useToast } from './use-toast';
import { useUser } from './use-user';
import { v4 as uuidv4 } from 'uuid';
import { deleteFileFlow } from '@/ai/flows/backblaze-flow';
import { getSecondaryFirestore, ensureSecondaryAuth } from '@/firebase/secondary';

const ETHIOPIAN_MONTHS = [
  ['Meskerem'], 
  ['Tikimt', 'Tekemt'], 
  ['Hidar'], 
  ['Tahsas', 'Tasas'], 
  ['Tir', 'Ter'], 
  ['Yakatit', 'Yekatit'],
  ['Megabit'], 
  ['Miyazia', 'Miazia'], 
  ['Ginbot', 'Genbot'], 
  ['Sene'], 
  ['Hamle'], 
  ['Nehase', 'Nehasse'], 
  ['Pagume', 'Pagumene']
];

export function getEthiopianPeriod(date: Date | any) {
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
  if (isNaN(d.getTime())) return 'Unknown Period';

  const month = d.getMonth();
  const day = d.getDate();
  let year = d.getFullYear() - 8;
  let ethMonthIndex = 0;

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
  
  if (month > 8 || (month === 8 && day >= 11)) year = d.getFullYear() - 7;
  
  return `${ETHIOPIAN_MONTHS[ethMonthIndex][0]} ${year}`;
}

function sanitizePeriodLabel(label: string): string {
    if (!label) return 'Unknown Period';
    return label
        .replace(/^(week|weekly)\s*[:\- ]*\s*/i, '')
        .replace(/\s+am$/i, '')
        .trim();
}

export function ethToGregorian(monthName: string, day: number, ethYear: number): Date {
  const monthIdx = ETHIOPIAN_MONTHS.findIndex(aliases => 
    aliases.some(a => a.toLowerCase() === monthName.toLowerCase())
  );
  
  if (monthIdx === -1) return new Date(0); 

  const baseGreg = new Date(2024, 8, 11); 
  const yearsDiff = ethYear - 2017;
  
  let totalDays = yearsDiff * 365 + Math.floor((yearsDiff + 1) / 4);
  totalDays += monthIdx * 30;
  totalDays += (day - 1);
  
  const target = new Date(baseGreg.getTime());
  target.setDate(target.getDate() + totalDays);
  return target;
}

function parseFilterDateFromLabel(label: string, fallback: Date): Date {
    if (!label) return fallback;

    try {
        const weeklyMatch = label.match(/-\s+([a-zA-Z]+)\s+(\d+),\s+(\d+)/);
        if (weeklyMatch) {
            const [_, month, day, year] = weeklyMatch;
            const parsed = ethToGregorian(month, parseInt(day), parseInt(year));
            if (parsed.getTime() !== 0) return parsed;
        }

        const monthlyMatch = label.match(/^([a-zA-Z]+)\s+(\d+)$/);
        if (monthlyMatch) {
            const [_, month, year] = monthlyMatch;
            const day = month.toLowerCase().includes('pagume') ? 5 : 30;
            const parsed = ethToGregorian(month, day, parseInt(year));
            if (parsed.getTime() !== 0) return parsed;
        }
    } catch (e) {
        console.warn("Failed to parse period label for filtering:", label);
    }

    return fallback;
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
    const processedPrimary = (primaryExpenses || []).map(exp => {
        const rawDate = exp.date?.seconds ? new Date(exp.date.seconds * 1000) : new Date(exp.date);
        return {
            ...exp,
            date: rawDate,
            periodLabel: getEthiopianPeriod(rawDate),
            isSecondary: false
        }
    });

    const processedSecondary = secondaryRecords
        .map(curr => {
            const fallbackDate = curr.timestamp?.seconds ? new Date(curr.timestamp.seconds * 1000) : (curr.date ? new Date(curr.date) : new Date(0));
            const rawLabel = curr.periodLabel || getEthiopianPeriod(fallbackDate);
            const sanitizedLabel = sanitizePeriodLabel(rawLabel);
            const filterDate = parseFilterDateFromLabel(sanitizedLabel, fallbackDate);

            return {
                id: curr.id,
                description: `Payroll: ${curr.employeeName || 'Staff'}`,
                amount: curr.totalPay ?? curr.amount ?? 0,
                date: filterDate, 
                category: 'Employee Expense',
                paidTo: curr.employeeName || 'Staff Member',
                status: curr.paymentStatus || 'Paid',
                hasReceipt: true,
                ownerId: 'system',
                isSecondary: true,
                periodLabel: sanitizedLabel,
                type: curr.type || 'Monthly'
            };
        });

    const combined = [...processedPrimary, ...processedSecondary];

    return combined.sort((a, b) => {
        const dateA = a.date instanceof Date ? a.date.getTime() : 0;
        const dateB = b.date instanceof Date ? b.date.getTime() : 0;
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
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-700">
      <ExpenseContext.Provider value={value}>
        {children}
      </ExpenseContext.Provider>
    </div>
  );
}

export function useExpenses() {
  const context = useContext(ExpenseContext);
  if (context === undefined) {
    throw new Error('useExpenses must be used within a ExpenseProvider');
  }
  return context;
}
