
"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { useStock } from '@/hooks/use-stock';
import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Loader2, 
    PlusCircle, 
    Package, 
    Search, 
    AlertTriangle,
    Boxes,
    Plus,
    Minus,
    Image as ImageIcon
} from 'lucide-react';
import { formatTimestamp, cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/ui/dynamic-icon';
import Image from 'next/image';
import type { StockUnit, StockTransactionType } from '@/lib/types';

const STOCK_UNITS: StockUnit[] = ['pcs', 'kg', 'liter', 'meters', 'set', 'box', 'sheets', 'liters', 'grams'];

export default function StockPage() {
  const { optimisticItems, transactions, stockSettings, loading, addStockItem, adjustStock } = useStock();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [isPending, startTransition] = useTransition();

  // Dialog States
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Form States
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'pcs' as StockUnit, icon: 'Package', description: '' });
  const [adjustment, setAdjustment] = useState({ 
    itemId: '', 
    type: 'Out' as StockTransactionType, 
    quantity: 1, 
    reason: '', 
    orderId: '' 
  });

  const filteredItems = useMemo(() => {
    return optimisticItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [optimisticItems, searchTerm]);

  const lowStockItems = useMemo(() => 
    filteredItems.filter(i => i.currentQuantity <= (i.minQuantity || 5)),
  [filteredItems]);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) return;
    startTransition(async () => {
        await addStockItem(newItem);
        setNewItem({ name: '', category: '', unit: 'pcs', icon: 'Package', description: '' });
        setIsAddingItem(false);
    });
  };

  const handleAdjustStock = async () => {
    if (!adjustment.itemId || adjustment.quantity <= 0) return;
    setIsAdjusting(false);
    startTransition(async () => {
        await adjustStock(adjustment);
        setAdjustment({ itemId: '', type: 'Out', quantity: 1, reason: '', orderId: '' });
    });
  };

  const quickAdjust = (itemId: string, type: StockTransactionType) => {
      setAdjustment({ ...adjustment, itemId, type, orderId: '', reason: type === 'In' ? 'Restock' : 'Workshop Use' });
      setIsAdjusting(true);
  };

  if (loading && filteredItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Inventory</h1>
          <p className="text-sm text-muted-foreground font-medium">Manage workshop materials and stock levels</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button className="rounded-full px-6 shadow-lg shadow-primary/20 w-full sm:w-auto" onClick={() => setIsAddingItem(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> New Catalog Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50 overflow-hidden flex flex-col justify-center min-h-[140px]">
              <CardHeader className="py-4 pb-4 border-b border-slate-100/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Stock Level Alerts ({lowStockItems.length})
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                   {lowStockItems.length === 0 ? (
                       <div className="flex items-center gap-3 py-2">
                           <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                               <Package className="h-4 w-4 text-emerald-600" />
                           </div>
                           <p className="text-sm font-bold text-slate-600">All materials are currently above safety thresholds.</p>
                       </div>
                   ) : (
                       <ScrollArea className="h-[80px]">
                           <div className="space-y-3">
                               {lowStockItems.map(item => (
                                   <div key={item.id} className="flex items-center justify-between">
                                       <div className="flex items-center gap-2">
                                           <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                           <span className="text-xs font-bold text-slate-800">{item.name}</span>
                                       </div>
                                       <Badge variant="destructive" className="h-5 px-1.5 text-[8px] font-black uppercase">Low: {item.currentQuantity} {item.unit}</Badge>
                                   </div>
                               ))}
                           </div>
                       </ScrollArea>
                   )}
              </CardContent>
          </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="bg-white/40 backdrop-blur-sm p-2 rounded-2xl border ring-1 ring-slate-200/50 flex flex-col sm:flex-row gap-3 items-center shadow-sm">
            <TabsList className="bg-transparent border-none p-0 h-10 w-full sm:w-auto">
                <TabsTrigger value="inventory" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold text-xs px-6 h-full transition-all">Stock Levels</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold text-xs px-6 h-full transition-all">Movement History</TabsTrigger>
            </TabsList>
            
            <div className="relative flex-grow w-full sm:max-w-md ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                    placeholder="Search materials..." 
                    className="pl-10 bg-white/50 border-none h-10 shadow-inner rounded-xl" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-muted/5 rounded-2xl border-2 border-dashed">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">No catalog items found</p>
              </div>
            ) : filteredItems.map(item => {
              const isLow = item.currentQuantity <= (item.minQuantity || 5);
              return (
                <Card key={item.id} className={cn(
                    "overflow-hidden transition-all border-none shadow-md hover:shadow-xl bg-white relative flex flex-col h-full ring-1 ring-slate-100",
                    isLow && "ring-red-100 bg-red-50/5"
                )}>
                  <div className="p-3 sm:p-4 flex-grow flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                        {/* Visual Reference - Sized up for better visibility */}
                        <div className="relative h-32 w-32 sm:h-40 sm:w-40 md:h-48 md:w-48 shrink-0 bg-muted rounded-[2rem] overflow-hidden border shadow-inner">
                             {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                             ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                    <ImageIcon className="h-10 w-10 text-slate-200" />
                                </div>
                             )}
                             {/* Stock Counter Badge */}
                             <div className={cn(
                                 "absolute top-2 left-2 h-9 w-9 rounded-full flex items-center justify-center text-[11px] font-black shadow-lg ring-4 ring-white",
                                 isLow ? "bg-destructive text-white" : "bg-slate-900 text-white"
                             )}>
                                 {item.currentQuantity}
                             </div>
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="flex flex-col gap-2 shrink-0">
                            <button 
                                onClick={(e) => { e.stopPropagation(); quickAdjust(item.id, 'In'); }}
                                className="h-9 w-9 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors shadow-sm"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); quickAdjust(item.id, 'Out'); }}
                                className="h-9 w-9 rounded-full border border-red-200 bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors shadow-sm"
                            >
                                <Minus className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="space-y-1.5 min-w-0">
                        <h3 className="text-sm sm:text-base font-black text-slate-800 leading-tight line-clamp-2">{item.name}</h3>
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="h-5 px-2 text-[8px] font-black uppercase border-slate-200 text-slate-500 bg-slate-50">
                                {item.category}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">{item.unit}</span>
                        </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Material</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Adjustment</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes / Project</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        No stock adjustments recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map(tx => {
                      const item = optimisticItems.find(i => i.id === tx.itemId);
                      return (
                        <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                          <TableCell className="whitespace-nowrap text-[10px] font-mono text-muted-foreground">
                            {formatTimestamp(tx.timestamp)}
                          </TableCell>
                          <TableCell className="font-bold text-xs whitespace-nowrap">
                            {item?.name || 'Unknown Item'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'In' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter shrink-0">
                                {tx.type === 'In' ? 'Inflow' : 'Outflow'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs tabular-nums text-slate-900">
                            {tx.type === 'In' ? '+' : '-'}{tx.quantity}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-[10px] font-medium text-slate-600">
                            {tx.orderId && tx.orderId !== 'none' ? (
                               <span className="flex items-center gap-1 text-primary font-black uppercase tracking-tighter">
                                <Package className="h-2.5 w-2.5" /> Project {
                                    (() => {
                                        const foundOrder = orders.find(o => o.id === tx.orderId);
                                        return foundOrder ? (foundOrder.uniqueName?.slice(-5) || 'Order') : tx.orderId.slice(-5);
                                    })()
                                }
                              </span>
                            ) : (
                              <span className="opacity-60">{tx.reason || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-[10px] font-bold text-slate-400 whitespace-nowrap uppercase tracking-tight">{tx.userName}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">New Material Entry</DialogTitle>
            <DialogDescription>Define a material to track in the workshop catalog.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Item Name</Label>
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. Oak Board" className="h-11 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Category</Label>
                <Select value={newItem.category} onValueChange={v => setNewItem({...newItem, category: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(stockSettings?.categories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Unit</Label>
                <Select value={newItem.unit} onValueChange={(v: StockUnit) => setNewItem({...newItem, unit: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Icon Name</Label>
                <div className="flex items-center gap-2">
                  <Input value={newItem.icon} onChange={e => setNewItem({...newItem, icon: e.target.value})} placeholder="Lucide name" className="h-11 rounded-xl" />
                  <div className="h-11 w-11 border bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    <DynamicIcon icon={newItem.icon || 'Package'} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)} className="rounded-full px-6">Cancel</Button>
            <Button onClick={handleAddItem} disabled={isPending} className="rounded-full px-8 shadow-lg shadow-primary/20">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Material
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{adjustment.type === 'In' ? 'Restock Material' : 'Record Usage'}</DialogTitle>
            <DialogDescription>
              {adjustment.type === 'In' ? 'Add inventory from supplier.' : 'Deduct materials used in production.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4 bg-slate-900 text-white p-4 rounded-2xl shadow-lg">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                <DynamicIcon icon={optimisticItems.find(i => i.id === adjustment.itemId)?.icon || 'Package'} className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{optimisticItems.find(i => i.id === adjustment.itemId)?.name}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Current: {optimisticItems.find(i => i.id === adjustment.itemId)?.currentQuantity} {optimisticItems.find(i => i.id === adjustment.itemId)?.unit}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Quantity ({optimisticItems.find(i => i.id === adjustment.itemId)?.unit})</Label>
              <Input type="number" min="1" value={adjustment.quantity} onChange={e => setAdjustment({...adjustment, quantity: Number(e.target.value)})} className="h-11 rounded-xl text-lg font-black" />
            </div>

            {adjustment.type === 'Out' && (
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Project Association</Label>
                <Select value={adjustment.orderId} onValueChange={v => setAdjustment({...adjustment, orderId: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Search active orders..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Shop Maintenance</SelectItem>
                    {orders.filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status)).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.uniqueName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Movement Notes</Label>
              <Input value={adjustment.reason} onChange={e => setAdjustment({...adjustment, reason: e.target.value})} placeholder={adjustment.type === 'In' ? 'Supplier name...' : 'Usage details...'} className="h-11 rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjusting(false)} className="rounded-full px-6">Discard</Button>
            <Button onClick={handleAdjustStock} className="rounded-full px-10 shadow-lg shadow-primary/20">Confirm Movement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
