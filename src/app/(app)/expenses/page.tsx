
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Search, FileText, Trash2, Calendar as CalendarIcon, Wallet, Receipt, User, UploadCloud, Eye, Download, CheckCircle2, ShieldCheck } from 'lucide-react';
import { formatCurrency, formatTimestamp, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

const CATEGORIES = ['Materials', 'Hardware', 'Salary', 'Rent', 'Utilities', 'Maintenance', 'Transport', 'Marketing', 'Other'];

export default function ExpensesPage() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const { settings: paymentSettings } = usePaymentSettings();
  const { uploadFile, uploadProgress } = useOrders();
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
      const matchesSearch = exp.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           exp.paidTo.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesDate = true;
      if (dateRange?.from) {
        const expDate = exp.date?.seconds ? new Date(exp.date.seconds * 1000) : new Date(exp.date);
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to || dateRange.from);
        matchesDate = isWithinInterval(expDate, { start, end });
      }
      
      return matchesSearch && matchesDate;
    });
  }, [expenses, searchTerm, dateRange]);

  const totalSpent = useMemo(() => {
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
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track purchases, overheads, and shop expenditures.</p>
        </div>
        <Button onClick={() => setIsAdding(true)}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Total Period Expenditure</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-3xl font-bold text-primary">{formatCurrency(totalSpent)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{filteredExpenses.length} Transactions Recorded</p>
              </CardContent>
          </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search description, vendor..." 
            className="pl-10" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Paid To</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Docs</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="animate-spin h-8 w-8 mx-auto opacity-20" /></TableCell></TableRow>
              ) : filteredExpenses.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No expenses found for this period.</TableCell></TableRow>
              ) : filteredExpenses.map(exp => (
                <TableRow key={exp.id}>
                  <TableCell className="text-xs whitespace-nowrap">{formatTimestamp(exp.date)}</TableCell>
                  <TableCell className="font-medium">{exp.description}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] uppercase font-bold">{exp.category}</Badge></TableCell>
                  <TableCell className="text-sm">{exp.paidTo}</TableCell>
                  <TableCell className="text-xs">
                    {exp.bankAccountId === 'Cash' ? 'Cash' : 
                      paymentSettings?.banks.find(b => b.id === exp.bankAccountId)?.bankName || 'Unknown Bank'}
                  </TableCell>
                  <TableCell className="text-right font-bold text-sm">{formatCurrency(exp.amount)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                        {exp.receiptAttachment ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => window.open(exp.receiptAttachment!.url, '_blank')} title="View Standard Receipt">
                            <FileText className="h-4 w-4" />
                        </Button>
                        ) : exp.hasReceipt ? (
                            <Badge variant="outline" className="text-[9px] opacity-40">Miss Recpt</Badge>
                        ) : null}
                        
                        {exp.withholdAttachment ? (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => window.open(exp.withholdAttachment!.url, '_blank')} title="View Withholding Receipt">
                            <ShieldCheck className="h-4 w-4" />
                        </Button>
                        ) : exp.hasWithhold ? (
                            <Badge variant="outline" className="text-[9px] text-amber-600/50 border-amber-600/20">Miss Withhold</Badge>
                        ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(exp)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

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
