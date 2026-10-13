
"use client";

import React, { useState, useTransition, useMemo } from 'react';
import { useStock } from '@/hooks/use-stock';
import { useOrders } from '@/hooks/use-orders';
import { useSecondaryItems } from '@/hooks/use-secondary-items';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
    Loader2, 
    PlusCircle, 
    MinusCircle, 
    History, 
    Package, 
    Search, 
    Settings, 
    Trash2, 
    ShoppingCart, 
    FlaskConical, 
    Library, 
    AlertTriangle,
    Boxes,
    ArrowUpRight,
    TrendingDown,
    Image as ImageIcon
} from 'lucide-react';
import { formatTimestamp, formatOrderId, formatOrderUniqueName, cn, formatCurrency } from '@/lib/utils';
import { DynamicIcon } from '@/components/ui/dynamic-icon';
import Image from 'next/image';
import type { StockItem, StockUnit, StockTransactionType, SecondaryItem } from '@/lib/types';

const STOCK_UNITS: StockUnit[] = ['pcs', 'kg', 'liter', 'meters', 'set', 'box', 'sheets', 'liters', 'grams'];

export default function StockPage() {
  const { stockItems, optimisticItems, transactions, stockSettings, loading: stockLoading, addStockItem, adjustStock, updateStockSettings, deleteStockItem } = useStock();
  const { items: secondaryItems, loading: secondaryLoading } = useSecondaryItems();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');
  const [isPending, startTransition] = useTransition();

  // Dialog States
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Form States
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'pcs' as StockUnit, icon: 'Package', description: '' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [adjustment, setAdjustment] = useState({ 
    itemId: '', 
    type: 'Out' as StockTransactionType, 
    quantity: 1, 
    reason: '', 
    orderId: '' 
  });

  const filteredItems = (optimisticItems || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCatalog = (secondaryItems || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const lowStockItems = useMemo(() => 
    optimisticItems.filter(i => i.currentQuantity <= (i.minQuantity || 0)),
  [optimisticItems]);

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) return;
    startTransition(async () => {
        await addStockItem(newItem);
        setNewItem({ name: '', category: '', unit: 'pcs', icon: 'Package', description: '' });
        setIsAddingItem(false);
    });
  };

  const handleAddCategory = async () => {
    if (!newCategoryName || !stockSettings) return;
    if (stockSettings.categories.includes(newCategoryName)) return;
    await updateStockSettings({
      ...stockSettings,
      categories: [...stockSettings.categories, newCategoryName]
    });
    setNewCategoryName('');
  };

  const handleDeleteCategory = async (cat: string) => {
    if (!stockSettings) return;
    await updateStockSettings({
      ...stockSettings,
      categories: stockSettings.categories.filter(c => c !== cat)
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

  const openAdjustmentDialog = (item: StockItem, type: StockTransactionType) => {
    setAdjustment({ ...adjustment, itemId: item.id, type, orderId: '' });
    setIsAdjusting(true);
  };

  if (stockLoading && stockItems.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary opacity-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-slate-900">Inventory</h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" className="rounded-full px-5" onClick={() => setIsManagingCategories(true)}>
            <Settings className="h-4 w-4 mr-2" /> Categories
          </Button>
          <Button className="rounded-full px-6 shadow-lg shadow-primary/20" onClick={() => setIsAddingItem(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> New Record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="bg-slate-900 text-white border-none shadow-xl relative overflow-hidden group lg:col-span-1 min-h-[160px] flex flex-col justify-center">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <Boxes className="h-24 w-24" />
              </div>
              <CardHeader className="py-4 pb-2 relative z-10">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Tracked Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 relative z-10">
                  <div className="text-4xl font-black tracking-tighter tabular-nums">{optimisticItems.length}</div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[8px] font-black border-slate-700 text-slate-400 px-2 py-0">
                        {stockSettings?.categories.length} CATEGORIES
                    </Badge>
                  </div>
              </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-none shadow-xl bg-white/60 backdrop-blur-md ring-1 ring-slate-200/50 overflow-hidden flex flex-col justify-center">
              <CardHeader className="py-4 pb-4 border-b border-slate-100/50">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-amber-500" /> Stock Status Alerts
                  </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                   {lowStockItems.length === 0 ? (
                       <div className="flex items-center gap-3 py-2">
                           <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                               <Package className="h-4 w-4 text-emerald-600" />
                           </div>
                           <p className="text-sm font-bold text-slate-600">All managed items are sufficiently stocked.</p>
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
                <TabsTrigger value="catalog" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold text-xs px-6 h-full transition-all">Material Catalog</TabsTrigger>
                <TabsTrigger value="history" className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white font-bold text-xs px-6 h-full transition-all">Tx Log</TabsTrigger>
            </TabsList>
            
            <div className="relative flex-grow w-full max-w-md ml-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input 
                    placeholder="Quick search items or groups..." 
                    className="pl-10 bg-white/50 border-none h-10 shadow-inner rounded-xl" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.length === 0 ? (
              <div className="col-span-full py-20 text-center bg-muted/5 rounded-2xl border-2 border-dashed">
                  <p className="text-sm font-bold uppercase tracking-widest opacity-30">No items found matching filter</p>
              </div>
            ) : filteredItems.map(item => {
              const isLow = item.currentQuantity <= (item.minQuantity || 0);
              return (
                <Card key={item.id} className={cn(
                    "overflow-hidden group transition-all border-none shadow-md hover:shadow-xl bg-white relative ring-1 ring-slate-100",
                    isLow && "ring-destructive/20 bg-red-50/10"
                )}>
                  <CardHeader className="bg-muted/30 pb-4 border-b">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0 ring-1 ring-slate-200/50">
                        <DynamicIcon icon={item.icon || 'Package'} className={cn("h-6 w-6", isLow ? "text-destructive" : "text-slate-400")} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-base font-bold truncate text-slate-800">{item.name}</CardTitle>
                          {isLow && <Badge variant="destructive" className="h-5 px-1.5 text-[8px] font-black uppercase">Low Stock</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{item.category}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6 space-y-5">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-inner">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-[0.1em] leading-none mb-1">Quantity on Hand</span>
                            <span className={cn("text-3xl font-black tabular-nums leading-none tracking-tight", isLow ? "text-destructive" : "text-slate-900")}>
                                {item.currentQuantity} <span className="text-xs font-bold text-muted-foreground opacity-60 ml-0.5">{item.unit}</span>
                            </span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg hover:bg-slate-900 hover:text-white" onClick={() => openAdjustmentDialog(item, 'In')}>
                                <PlusCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 rounded-lg hover:bg-slate-900 hover:text-white" onClick={() => openAdjustmentDialog(item, 'Out')}>
                                <MinusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold uppercase">
                            <History className="h-3 w-3 opacity-40" />
                            Updated {formatTimestamp(item.lastUpdated)}
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/20 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={() => deleteStockItem(item.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {secondaryLoading && (
                    <div className="col-span-full py-20 flex flex-col items-center gap-4">
                        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Connecting to material database...</p>
                    </div>
                )}
                {!secondaryLoading && filteredCatalog.length === 0 && (
                    <div className="col-span-full py-20 text-center bg-muted/5 rounded-2xl border-2 border-dashed">
                        <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-10" />
                        <p className="text-sm font-bold text-muted-foreground">No catalog designs found matching your search.</p>
                    </div>
                )}
                {!secondaryLoading && filteredCatalog.map((item) => (
                    <Card key={item.id} className="overflow-hidden border-none shadow-md group ring-1 ring-slate-100 flex flex-col h-full bg-white">
                        <div className="aspect-square relative bg-muted flex items-center justify-center overflow-hidden">
                            {item.imageUrl ? (
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" />
                            ) : (
                                <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                            )}
                            <div className="absolute top-2 right-2">
                                <Badge variant="secondary" className="h-5 px-1.5 text-[8px] font-black uppercase bg-white/90 backdrop-blur-sm border-none shadow-sm">{item.unit}</Badge>
                            </div>
                        </div>
                        <CardContent className="p-4 flex-grow flex flex-col gap-1">
                            <p className="text-[8px] font-black uppercase tracking-[0.15em] text-primary/70">{item.category}</p>
                            <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h3>
                        </CardContent>
                        <CardFooter className="px-4 pb-4 pt-0">
                            <Button variant="outline" className="w-full h-8 rounded-xl text-[10px] font-bold uppercase tracking-tight hover:bg-slate-900 hover:text-white" asChild>
                                <Link href="/orders/new">Add to BOM</Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card className="border-none shadow-xl bg-white overflow-hidden ring-1 ring-slate-100">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="border-none">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Item</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Details</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                        No recorded workshop movements.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map(tx => {
                      const item = stockItems.find(i => i.id === tx.itemId);
                      return (
                        <TableRow key={tx.id} className="hover:bg-slate-50 transition-colors border-slate-100">
                          <TableCell className="whitespace-nowrap text-[10px] font-mono text-muted-foreground">
                            {formatTimestamp(tx.timestamp)}
                          </TableCell>
                          <TableCell className="font-bold text-xs whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <DynamicIcon icon={item?.icon || 'Package'} className="h-3.5 w-3.5 opacity-40" />
                              {item?.name || 'Deleted Item'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'In' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[8px] font-black uppercase tracking-tighter shrink-0">
                                {tx.type === 'In' ? 'Restock' : 'Workshop Use'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-black text-xs tabular-nums text-slate-900">
                            {tx.type === 'In' ? '+' : '-'}{tx.quantity}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-[10px] font-medium text-slate-600">
                            {tx.reason === 'Sold' ? (
                                <span className="flex items-center gap-1 text-emerald-600 font-black uppercase tracking-tighter">
                                    <ShoppingCart className="h-2.5 w-2.5" /> Retail Sale
                                </span>
                            ) : tx.orderId && tx.orderId !== 'none' ? (
                               <span className="flex items-center gap-1 text-primary font-black uppercase tracking-tighter">
                                <Package className="h-2.5 w-2.5" /> Project {
                                    (() => {
                                        const foundOrder = orders.find(o => o.id === tx.orderId);
                                        return foundOrder ? foundOrder.uniqueName?.slice(-5) : tx.orderId.slice(-5);
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
            <DialogTitle className="text-xl font-bold">New Inventory Entry</DialogTitle>
            <DialogDescription>Define a material item to track locally in this workshop.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Item Name</Label>
                <Input value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. White Wood Glue" className="h-11 rounded-xl" />
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
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Unit of Measure</Label>
                <Select value={newItem.unit} onValueChange={(v: StockUnit) => setNewItem({...newItem, unit: v})}>
                  <SelectTrigger className="h-11 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Icon Search</Label>
                <div className="flex items-center gap-2">
                  <Input value={newItem.icon} onChange={e => setNewItem({...newItem, icon: e.target.value})} placeholder="Lucide name" className="h-11 rounded-xl" />
                  <div className="h-11 w-11 border bg-slate-50 rounded-xl flex items-center justify-center shrink-0">
                    <DynamicIcon icon={newItem.icon || 'Package'} className="text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Description</Label>
              <Textarea value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Usage notes..." rows={3} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)} className="rounded-full px-6">Cancel</Button>
            <Button onClick={handleAddItem} disabled={isPending} className="rounded-full px-8 shadow-lg shadow-primary/20">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagingCategories} onOpenChange={setIsManagingCategories}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Inventory Groupings</DialogTitle>
            <DialogDescription>Define categories to organize your local stock.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New group name..." 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
                className="h-11 rounded-xl"
              />
              <Button onClick={handleAddCategory} className="rounded-xl px-6 h-11">Add</Button>
            </div>
            <ScrollArea className="h-64 border rounded-2xl p-2 bg-slate-50">
              <div className="space-y-1">
                {(stockSettings?.categories || []).map(cat => (
                  <div key={cat} className="flex justify-between items-center p-3 rounded-xl hover:bg-white hover:shadow-sm transition-all group">
                    <span className="text-sm font-bold text-slate-700">{cat}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteCategory(cat)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManagingCategories(false)} className="rounded-full px-8">Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{adjustment.type === 'In' ? 'Restock Item' : 'Record Workshop Use'}</DialogTitle>
            <DialogDescription>
              {adjustment.type === 'In' ? 'Increase quantity through purchase.' : 'Deduct materials used in production.'}
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
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Removal Context</Label>
                <Select value={adjustment.reason} onValueChange={v => setAdjustment({...adjustment, reason: v})}>
                    <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="Select context..." /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Used in Production">Project Production</SelectItem>
                        <SelectItem value="Sold">Retail Sale</SelectItem>
                        <SelectItem value="Damaged/Waste">Waste / Damaged</SelectItem>
                        <SelectItem value="Other">Other Movement</SelectItem>
                    </SelectContent>
                </Select>
              </div>
            )}

            {adjustment.type === 'Out' && adjustment.reason !== 'Sold' && (
              <div className="grid gap-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Associate with Project</Label>
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
              <Label className="text-xs font-black uppercase tracking-widest text-slate-500">Activity Notes</Label>
              <Input value={adjustment.reason === 'Sold' ? adjustment.reason : adjustment.reason} onChange={e => setAdjustment({...adjustment, reason: e.target.value})} placeholder={adjustment.type === 'In' ? 'Supplier name or P.O. #' : 'Brief details...'} className="h-11 rounded-xl" />
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
