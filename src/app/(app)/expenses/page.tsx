'use client';

import React, { useState, useMemo } from 'react';
import { useExpenses } from '@/hooks/use-expenses';
import { usePaymentSettings } from '@/hooks/use-payment-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
    Loader2, 
    PlusCircle, 
    Search, 
    FileText, 
    Trash2, 
    Wallet, 
    User, 
    UploadCloud, 
    CheckCircle2, 
    ShieldCheck, 
    Database, 
    ShoppingCart, 
    Calendar,
    Users,
    Building,
    Zap,
    Wrench,
    Truck,
    Megaphone,
    Package,
    Banknote
} from 'lucide-react';
import { formatCurrency, formatTimestamp, cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import { Timestamp } from 'firebase/firestore';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay, isValid, startOfMonth, endOfMonth } from 'date-fns';
import type { Expense } from '@/lib/types';

const CATEGORIES = ['Materials', 'Hardware', 'Salary', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Marketing', 'Other'];

const CATEGORY_ICONS: Record<string, any> = {
  'Materials': Database,
  'Hardware': ShoppingCart,
  'Salary': Users,
  'Employee Expense': Users,
  'Rent': Building,
  'Utilities': Zap,
  'Maintenance': Wrench,
  'Transport': Truck,
  'Marketing': Megaphone,
  'Other': Package,
};

export default function ExpensesPage() {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const { settings: paymentSettings } = usePaymentSettings();
  const { uploadFile } = useOrders();
  const { role } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [isAdding, setIsAdding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newExpense, setNewExpense] = useState<any>({
    description: '',
    amount: 0,
    category: 'Materials',
    paidTo: '',
    bankAccountId: 'Cash',
    hasReceipt: true,
    hasWithhold: false,
    status: 'Paid',
    date: new Date(),
  });

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingWithhold, setUploadingWithhold] = useState(false);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = (
          exp.description.toLowerCase().includes(search) || 
          exp.paidTo.toLowerCase().includes(search) ||
          exp.periodLabel?.toLowerCase().includes(search)
      );

      let matchesDate = true;
      if (dateRange?.from) {
          const expDate = exp.date instanceof Date ? exp.date : (exp.date?.seconds ? new Date(exp.date.seconds * 1000) : new Date(exp.date));
          
          if (!isValid(expDate) || expDate.getTime() === 0) {
              matchesDate = false;
          } else {
              const start = startOfDay(dateRange.from);
              const end = endOfDay(dateRange.to || dateRange.from);
              matchesDate = isWithinInterval(expDate, { start, end });
          }
      }

      return matchesSearch && matchesDate;
    });
  }, [expenses, searchTerm, dateRange]);

  const expensesByPeriod = useMemo(() => {
    const groups: Record<string, { period: string, total: number, items: Expense[] }> = {};
    
    filteredExpenses.forEach(exp => {
      const period = exp.periodLabel || 'Other';
      if (!groups[period]) {
        groups[period] = { period, total: 0, items: [] };
      }
      groups[period].total += exp.amount;
      groups[period].items.push(exp);
    });

    return Object.values(groups).sort((a, b) => {
        const dateA = a.items[0].date instanceof Date ? a.items[0].date.getTime() : 0;
        const dateB = b.items[0].date instanceof Date ? b.items[0].date.getTime() : 0;
        return dateB - dateA;
    });
  }, [filteredExpenses]);

  const totalSpentAllTime = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const handleAddExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        ...newExpense,
        date: Timestamp.fromDate(newExpense.date),
      };
      await addExpense(payload);
      setIsAdding(false);
      setNewExpense({
        description: '',
        amount: 0,
        category: 'Materials',
        paidTo: '',
        bankAccountId: 'Cash',
        hasReceipt: true,
        hasWithhold: false,
        status: 'Paid',
        date: new Date(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadingReceipt(true);
          try {
              const att = await uploadFile(e.target.files[0]);
              setNewExpense({ ...newExpense, receiptAttachment: att });
          } finally {
              setUploadingReceipt(false);
          }
      }
  };

  const handleWithholdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setUploadingWithhold(true);
          try {
              const att = await uploadFile(e.target.files[0]);
              setNewExpense({ ...newExpense, withholdAttachment: att });
          } finally {
              setUploadingWithhold(false);
          }
      }
  };

  if (role !== 'Admin' && role !== 'Sales') {
      return <div className="p-8 text-center text-muted-foreground">Access Denied. Financial tracking is restricted to Admin and Sales roles.</div>;
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Financial Ledger</h1>
          <p className="text-muted-foreground text-sm">Expenses and payroll grouped by Ethiopian calendar periods.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Record Purchase
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Filtered Outflow</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(totalSpentAllTime)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{filteredExpenses.length} Transactions</p>
              </CardContent>
          </Card>
      </div>

      <div className="bg-muted/20 p-4 rounded-xl border flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search vendor, description or label..." 
            className="pl-10 bg-background" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} className="shrink-0" />
      </div>

      <div className="space-y-6">
        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 opacity-20" /></div>}
        
        {!loading && expensesByPeriod.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
                No records found for the current filter.
            </div>
        )}

        <Accordion type="multiple" className="space-y-4" defaultValue={expensesByPeriod.length > 0 ? [expensesByPeriod[0].period] : []}>
            {expensesByPeriod.map(group => {
                const containsPayroll = group.items.some(i => i.isSecondary);
                const mainHeaderText = containsPayroll 
                    ? "Employee Payout" 
                    : (group.items.length === 1 ? group.items[0].description : "Batch Expense");

                const firstCategory = group.items[0].category;
                const IconComp = containsPayroll ? Users : (CATEGORY_ICONS[firstCategory] || Package);

                return (
                    <AccordionItem key={group.period} value={group.period} className="border rounded-xl bg-card shadow-sm overflow-hidden">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-all [&[data-state=open]]:bg-muted/20">
                            <div className="flex flex-1 items-center justify-between gap-4 text-left">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                        <IconComp className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h2 className="text-base font-bold text-slate-900 tracking-tight">
                                            {mainHeaderText}
                                        </h2>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{group.period}</span>
                                            <Badge variant="outline" className="text-[8px] font-bold h-3.5 px-1">{group.items.length} {group.items.length === 1 ? 'Item' : 'Items'}</Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="text-lg font-black text-primary">{formatCurrency(group.total)}</p>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0 border-t">
                            <div className="divide-y">
                                {group.items.map(exp => (
                                    <div key={exp.id} className={cn("p-4 group", exp.isSecondary && "bg-blue-50/20")}>
                                        {exp.isSecondary ? (
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="min-w-0">
                                                        <h3 className="text-sm font-bold text-slate-800 truncate">{exp.paidTo}</h3>
                                                    </div>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-black text-slate-900">{formatCurrency(exp.amount)}</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 bg-background h-4">
                                                                {exp.category}
                                                            </Badge>
                                                            <span className="text-[10px] text-muted-foreground font-mono">{formatTimestamp(exp.date)}</span>
                                                        </div>
                                                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                                            {exp.description}
                                                        </h3>
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                                <User className="h-3 w-3" />
                                                                {exp.paidTo}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                                        <div className="text-right">
                                                            <p className="text-sm font-black text-slate-900">{formatCurrency(exp.amount)}</p>
                                                            <p className="text-[9px] text-muted-foreground uppercase font-medium">
                                                                {exp.bankAccountId === 'Cash' ? 'Cash' : 
                                                                paymentSettings?.banks.find(b => b.id === exp.bankAccountId)?.bankName || 'Unknown'}
                                                            </p>
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-1">
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(exp)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2 mt-3">
                                                    {exp.receiptAttachment && (
                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-bold uppercase gap-1" onClick={() => window.open(exp.receiptAttachment!.url, '_blank')}>
                                                            <FileText className="h-3 w-3" /> Receipt
                                                        </Button>
                                                    )}
                                                    {exp.withholdAttachment && (
                                                        <Button variant="outline" size="sm" className="h-6 px-2 text-[9px] font-bold uppercase gap-1 border-amber-200 text-amber-700 bg-amber-50" onClick={() => window.open(exp.withholdAttachment!.url, '_blank')}>
                                                            <ShieldCheck className="h-3 w-3" /> Withhold 2%
                                                        </Button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Purchase</DialogTitle>
            <DialogDescription>Enter the details for a manual workshop expenditure.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label>Description</Label>
              <Input 
                placeholder="e.g. 50 Sheets of White MDF" 
                value={newExpense.description} 
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div className="grid gap-2">
                  <Label>Amount</Label>
                  <div className="relative">
                    <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                    <Input 
                        type="number" 
                        className="pl-10" 
                        value={newExpense.amount} 
                        onChange={e => setNewExpense({...newExpense, amount: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={newExpense.category} onValueChange={v => setNewExpense({...newExpense, category: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Vendor / Recipient</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                    <Input className="pl-10" value={newExpense.paidTo} onChange={e => setNewExpense({...newExpense, paidTo: e.target.value})} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Payment Source</Label>
                  <Select value={newExpense.bankAccountId} onValueChange={v => setNewExpense({...newExpense, bankAccountId: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash Account</SelectItem>
                      {paymentSettings?.banks.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.bankName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            <div className="space-y-4 border-t pt-4">
                <div className="flex flex-col gap-4">
                    <Label className="flex items-center gap-2 cursor-pointer">
                        <Input 
                            type="checkbox" 
                            className="h-4 w-4" 
                            checked={newExpense.hasReceipt} 
                            onChange={e => setNewExpense({...newExpense, hasReceipt: e.target.checked})}
                        />
                        Official Purchase Receipt Available
                    </Label>

                    <Label className="flex items-center gap-2 cursor-pointer">
                        <Input 
                            type="checkbox" 
                            className="h-4 w-4" 
                            checked={newExpense.hasWithhold} 
                            onChange={e => setNewExpense({...newExpense, hasWithhold: e.target.checked})}
                        />
                        Withholding Tax Applied (2%)
                    </Label>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {newExpense.hasReceipt && (
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Standard Receipt</Label>
                            <input type="file" className="hidden" id="receipt-upload" onChange={handleReceiptUpload} />
                            <Button 
                                variant="outline" 
                                className="w-full h-16 border-dashed" 
                                type="button"
                                disabled={uploadingReceipt}
                                onClick={() => document.getElementById('receipt-upload')?.click()}
                            >
                                {uploadingReceipt ? (
                                    <Loader2 className="animate-spin h-4 w-4" />
                                ) : newExpense.receiptAttachment ? (
                                    <div className="flex items-center gap-2 text-primary font-bold text-xs">
                                        <CheckCircle2 className="h-4 w-4" /> Attached
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                        <UploadCloud className="h-4 w-4 opacity-30" />
                                        <span className="text-[10px]">Upload Recpt</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    )}

                    {newExpense.hasWithhold && (
                        <div className="space-y-2">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Withhold Receipt</Label>
                            <input type="file" className="hidden" id="withhold-upload" onChange={handleWithholdUpload} />
                            <Button 
                                variant="outline" 
                                className="w-full h-16 border-dashed border-amber-200 bg-amber-50/10" 
                                type="button"
                                disabled={uploadingWithhold}
                                onClick={() => document.getElementById('withhold-upload')?.click()}
                            >
                                {uploadingWithhold ? (
                                    <Loader2 className="animate-spin h-4 w-4 text-amber-600" />
                                ) : newExpense.withholdAttachment ? (
                                    <div className="flex items-center gap-2 text-amber-600 font-bold text-xs">
                                        <CheckCircle2 className="h-4 w-4" /> Attached
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                        <ShieldCheck className="h-4 w-4 text-amber-600/30" />
                                        <span className="text-[10px]">Withhold Recpt</span>
                                    </div>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleAddExpense} disabled={isSubmitting || uploadingReceipt || uploadingWithhold}>
                {isSubmitting && <Loader2 className="animate-spin mr-2 h-4 w-4" />} Save Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
