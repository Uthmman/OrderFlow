
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
import { Loader2, PlusCircle, Search, FileText, Trash2, Wallet, User, UploadCloud, CheckCircle2, ShieldCheck, Database, ListChecks, ChevronDown } from 'lucide-react';
import { formatCurrency, formatTimestamp, cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import { Timestamp } from 'firebase/firestore';
import type { Expense, ExpenseDetail } from '@/lib/types';

const CATEGORIES = ['Materials', 'Hardware', 'Salary', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Marketing', 'Other'];

const ETHIOPIAN_MONTHS = [
  'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yakatit',
  'Megabit', 'Miyazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
];

function getEthiopianPeriod(date: Date | any) {
  const d = date?.seconds ? new Date(date.seconds * 1000) : new Date(date);
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
  
  return `${ETHIOPIAN_MONTHS[ethMonthIndex]} ${year}`;
}

export default function ExpensesPage() {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses();
  const { settings: paymentSettings } = usePaymentSettings();
  const { uploadFile } = useOrders();
  const { role } = useUser();
  const [searchTerm, setSearchTerm] = useState('');

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
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [expenses, searchTerm]);

  const expensesByPeriod = useMemo(() => {
    const groups: Record<string, { period: string, total: number, items: Expense[] }> = {};
    
    filteredExpenses.forEach(exp => {
      const period = getEthiopianPeriod(exp.date);
      if (!groups[period]) {
        groups[period] = { period, total: 0, items: [] };
      }
      groups[period].total += exp.amount;
      groups[period].items.push(exp);
    });

    return Object.values(groups).sort((a, b) => {
        // Sort periods roughly by looking at the representative date of the first item
        const dateA = a.items[0].date?.seconds ? a.items[0].date.seconds : new Date(a.items[0].date).getTime();
        const dateB = b.items[0].date?.seconds ? b.items[0].date.seconds : new Date(b.items[0].date).getTime();
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
          <h1 className="text-3xl font-bold font-headline tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm">Track purchases and payroll grouped by Ethiopian calendar periods.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Filtered Expenditure</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(totalSpentAllTime)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{filteredExpenses.length} Records Found</p>
              </CardContent>
          </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search description, vendor, or period..." 
            className="pl-10 bg-background" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-6">
        {loading && <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 opacity-20" /></div>}
        
        {!loading && expensesByPeriod.length === 0 && (
            <div className="text-center py-20 text-muted-foreground bg-muted/5 rounded-xl border-2 border-dashed">
                No expenses found matching your search.
            </div>
        )}

        <Accordion type="multiple" className="space-y-4" defaultValue={[expensesByPeriod[0]?.period]}>
            {expensesByPeriod.map(group => (
                <AccordionItem key={group.period} value={group.period} className="border rounded-xl bg-card shadow-sm overflow-hidden">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 transition-all [&[data-state=open]]:bg-muted/20">
                        <div className="flex flex-1 items-center justify-between gap-4 text-left">
                            <div className="space-y-0.5">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">{group.period}</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                    {group.items.length} Transactions
                                </p>
                            </div>
                            <div className="text-right mr-4">
                                <p className="text-lg font-black text-primary">{formatCurrency(group.total)}</p>
                            </div>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0 border-t">
                        <div className="divide-y">
                            {group.items.map(exp => (
                                <div key={exp.id} className={cn("p-4 group", exp.isSecondary && "bg-primary/[0.02]")}>
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {exp.isSecondary && <Database className="h-3.5 w-3.5 text-primary/60" />}
                                                <Badge variant="outline" className="text-[8px] font-black uppercase px-1.5 py-0 bg-background h-4">
                                                    {exp.category}
                                                </Badge>
                                                <span className="text-[10px] text-muted-foreground font-mono">{formatTimestamp(exp.date)}</span>
                                            </div>
                                            <h3 className="text-sm font-bold text-slate-800">{exp.description}</h3>
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
                                                     paymentSettings?.banks.find(b => b.id === exp.bankAccountId)?.bankName || 'Payout'}
                                                </p>
                                            </div>
                                            
                                            <div className="flex items-center gap-1">
                                                {!exp.isSecondary && (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => deleteExpense(exp)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nested Employee Breakdown for System Groups */}
                                    {exp.isSecondary && exp.details && exp.details.length > 0 && (
                                        <Accordion type="single" collapsible className="mt-3 w-full border-t border-primary/10 pt-2">
                                            <AccordionItem value="breakdown" className="border-none">
                                                <AccordionTrigger className="py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline">
                                                    View Employee Details ({exp.details.length})
                                                </AccordionTrigger>
                                                <AccordionContent className="pt-2">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {exp.details.map((detail: ExpenseDetail) => (
                                                            <div key={detail.id} className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-primary/10 shadow-sm">
                                                                <div className="flex items-center gap-2 overflow-hidden">
                                                                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                                                        <User className="h-3 w-3 text-slate-400" />
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <p className="text-[11px] font-bold text-slate-800 truncate">{detail.name}</p>
                                                                        <p className="text-[8px] text-muted-foreground uppercase">{formatTimestamp(detail.date)}</p>
                                                                    </div>
                                                                </div>
                                                                <p className="text-[11px] font-black text-slate-900 ml-2">{formatCurrency(detail.amount)}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )}

                                    {/* Doc Badges for Standard Expenses */}
                                    {!exp.isSecondary && (
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
                                    )}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            ))}
        </Accordion>
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Expense</DialogTitle>
            <DialogDescription>Enter the details for a new shop expenditure.</DialogDescription>
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
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
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
                  <Label>Paid To (Vendor/Person)</Label>
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
                                        <span className="text-[10px]">Standard Recpt</span>
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
