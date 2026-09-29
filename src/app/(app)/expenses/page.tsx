
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
import { Loader2, PlusCircle, Search, FileText, Trash2, Calendar as CalendarIcon, Wallet, Receipt, User, UploadCloud, Eye, Download, CheckCircle2, ShieldCheck, Database, ListChecks, ChevronRight } from 'lucide-react';
import { formatCurrency, formatTimestamp, cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { isWithinInterval, startOfDay, endOfDay, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { useUser } from '@/hooks/use-user';
import { useOrders } from '@/hooks/use-orders';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import type { Expense } from '@/lib/types';

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

  const [selectedGroup, setSelectedGroup] = useState<Expense | null>(null);

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
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Expenses</h1>
          <p className="text-muted-foreground text-sm">Track purchases, overheads, and shop expenditures.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-primary/5 border-primary/10">
              <CardHeader className="py-4">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Total Period Expenditure</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(totalSpent)}</div>
                  <p className="text-[10px] text-muted-foreground mt-1 uppercase font-bold">{filteredExpenses.length} Transactions Recorded</p>
              </CardContent>
          </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 p-4 rounded-xl border">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search description, vendor..." 
            className="pl-10 bg-background" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <DateRangePicker dateRange={dateRange} onDateChange={setDateRange} className="shrink-0 w-full sm:w-auto" />
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block">
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
                <TableRow key={exp.id} className={cn(exp.isSecondary && "bg-muted/10")}>
                  <TableCell className="text-xs whitespace-nowrap">{formatTimestamp(exp.date)}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                        {exp.isSecondary && <Database className="h-3.5 w-3.5 text-primary/60" title="From Secondary System" />}
                        {exp.description}
                        {exp.details && exp.details.length > 0 && (
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] uppercase font-bold bg-primary/10 text-primary hover:bg-primary/20" onClick={() => setSelectedGroup(exp)}>
                                <ListChecks className="h-3 w-3 mr-1" /> Breakdown
                            </Button>
                        )}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px] uppercase font-bold">{exp.category}</Badge></TableCell>
                  <TableCell className="text-sm">{exp.paidTo}</TableCell>
                  <TableCell className="text-xs">
                    {exp.isSecondary ? 'System Payout' : 
                      exp.bankAccountId === 'Cash' ? 'Cash' : 
                      paymentSettings?.banks.find(b => b.id === exp.bankAccountId)?.bankName || 'Unknown Bank'}
                  </TableCell>
                  <TableCell className="text-right font-black text-sm">{formatCurrency(exp.amount)}</TableCell>
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
                    {exp.isSecondary ? (
                        <Badge variant="outline" className="text-[8px] font-black uppercase text-muted-foreground/60 border-none bg-muted/30">System Group</Badge>
                    ) : (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(exp)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Mobile Grid */}
      <div className="md:hidden space-y-4">
          {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin h-8 w-8 opacity-20" /></div>
          ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm italic">No expenses found.</div>
          ) : filteredExpenses.map(exp => (
              <Card key={exp.id} className={cn("overflow-hidden", exp.isSecondary && "border-primary/20 bg-primary/[0.02]")}>
                  <CardHeader className="p-4 pb-2 flex flex-row justify-between items-start space-y-0">
                      <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                             {exp.isSecondary && <Database className="h-3 w-3 text-primary/60 shrink-0" />}
                             <Badge variant="secondary" className="text-[8px] uppercase font-black px-1.5 py-0">{exp.category}</Badge>
                             <span className="text-[10px] text-muted-foreground font-mono">{formatTimestamp(exp.date)}</span>
                          </div>
                          <CardTitle className="text-sm font-bold truncate">{exp.description}</CardTitle>
                      </div>
                      <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{formatCurrency(exp.amount)}</p>
                      </div>
                  </CardHeader>
                  <CardFooter className="p-4 pt-2 flex items-center justify-between border-t border-slate-100 bg-muted/10">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{exp.paidTo}</span>
                      </div>
                      <div className="flex items-center gap-2">
                          {exp.details && exp.details.length > 0 && (
                              <Button variant="outline" size="sm" className="h-8 text-[10px] uppercase font-bold" onClick={() => setSelectedGroup(exp)}>
                                  Breakdown
                              </Button>
                          )}
                          {!exp.isSecondary && (
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteExpense(exp)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                  </CardFooter>
              </Card>
          ))}
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

      {/* Breakdown Dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={o => !o && setSelectedGroup(null)}>
          <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
              <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                      <Database className="h-5 w-5 text-primary" />
                      <DialogTitle>System Group Breakdown</DialogTitle>
                  </div>
                  <DialogDescription>Detailed payroll list for this period from the HR system.</DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                      <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Expenditure</p>
                          <p className="text-2xl font-black text-primary">{formatCurrency(selectedGroup?.amount || 0)}</p>
                      </div>
                      <Badge variant="outline" className="h-fit bg-background font-bold">{selectedGroup?.category}</Badge>
                  </div>

                  <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-2">Employee Records</p>
                      {selectedGroup?.details?.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                                      <User className="h-4 w-4 text-slate-500" />
                                  </div>
                                  <div>
                                      <p className="text-sm font-bold">{item.name}</p>
                                      <p className="text-[10px] text-muted-foreground uppercase">{formatTimestamp(item.date)}</p>
                                  </div>
                              </div>
                              <p className="text-sm font-black text-slate-900">{formatCurrency(item.amount)}</p>
                          </div>
                      ))}
                  </div>
              </div>

              <DialogFooter className="mt-6">
                  <Button variant="outline" onClick={() => setSelectedGroup(null)} className="w-full">Close Breakdown</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}
