"use client";

import React, { useState } from 'react';
import { useStock } from '@/hooks/use-stock';
import { useOrders } from '@/hooks/use-orders';
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
import { Loader2, PlusCircle, MinusCircle, History, Package, Search, Settings, Trash2 } from 'lucide-react';
import { formatTimestamp, formatOrderId, formatOrderUniqueName, cn } from '@/lib/utils';
import { DynamicIcon } from '@/components/ui/dynamic-icon';
import type { StockItem, StockUnit, StockTransactionType } from '@/lib/types';

const STOCK_UNITS: StockUnit[] = ['pcs', 'kg', 'liter', 'meters', 'set', 'box', 'sheets', 'liters', 'grams'];

export default function StockPage() {
  const { stockItems, transactions, stockSettings, loading, addStockItem, adjustStock, updateStockSettings, deleteStockItem } = useStock();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

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

  const filteredItems = (stockItems || []).filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.category) return;
    await addStockItem(newItem);
    setNewItem({ name: '', category: '', unit: 'pcs', icon: 'Package', description: '' });
    setIsAddingItem(false);
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
    await adjustStock(adjustment);
    setAdjustment({ itemId: '', type: 'Out', quantity: 1, reason: '', orderId: '' });
    setIsAdjusting(false);
  };

  const openAdjustmentDialog = (item: StockItem, type: StockTransactionType) => {
    setAdjustment({ ...adjustment, itemId: item.id, type, orderId: '' });
    setIsAdjusting(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Track materials, hardware, and shop supplies.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => setIsManagingCategories(true)}>
            <Settings className="h-4 w-4 mr-2" /> Categories
          </Button>
          <Button size="sm" onClick={() => setIsAddingItem(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> New Item
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
          <TabsTrigger value="inventory"><Package className="mr-2 h-4 w-4" /> Stock</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items, categories..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="hidden lg:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No inventory items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map(item => (
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                              <DynamicIcon icon={item.icon || 'Package'} className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-bold">{item.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 max-w-[250px]">{item.description}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                        <TableCell className="text-right">
                          <span className={cn("font-bold text-lg", item.currentQuantity <= (item.minQuantity || 0) && "text-destructive")}>
                            {item.currentQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openAdjustmentDialog(item, 'In')}>
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => openAdjustmentDialog(item, 'Out')}>
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteStockItem(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {filteredItems.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground col-span-full">No inventory items found.</p>
            ) : filteredItems.map(item => (
              <Card key={item.id} className="overflow-hidden">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                        <DynamicIcon icon={item.icon || 'Package'} className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{item.name}</CardTitle>
                        <CardDescription>{item.category}</CardDescription>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteStockItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {item.description && <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{item.description}</p>}
                  <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Quantity</span>
                      <span className={cn("text-2xl font-bold", item.currentQuantity <= (item.minQuantity || 0) && "text-destructive")}>
                        {item.currentQuantity} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(item, 'In')}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAdjustmentDialog(item, 'Out')}>
                        <MinusCircle className="h-4 w-4 mr-2" /> Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        No transactions recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map(tx => {
                      const item = stockItems.find(i => i.id === tx.itemId);
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                            {formatTimestamp(tx.timestamp)}
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <DynamicIcon icon={item?.icon || 'Package'} className="h-4 w-4 opacity-50" />
                              {item?.name || 'Deleted Item'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tx.type === 'In' ? 'default' : 'secondary'}>{tx.type}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold tabular-nums">
                            {tx.type === 'In' ? '+' : '-'}{tx.quantity}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">
                            {tx.orderId && tx.orderId !== 'none' ? (
                               <span className="flex items-center gap-1 text-primary font-medium">
                                <Package className="h-3 w-3" /> {
                                    (() => {
                                        const foundOrder = orders.find(o => o.id === tx.orderId);
                                        return foundOrder ? formatOrderUniqueName(foundOrder.customerName, foundOrder.products, foundOrder.id) : formatOrderId(tx.orderId!);
                                    })()
                                }
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{tx.reason || '-'}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">{tx.userName}</TableCell>
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Stock Item</DialogTitle>
            <DialogDescription>Add a new material or supply to track.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. White Wood Glue" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Select value={newItem.category} onValueChange={v => setNewItem({...newItem, category: v})}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    {(stockSettings?.categories || []).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit of Measure</Label>
                <Select value={newItem.unit} onValueChange={(v: StockUnit) => setNewItem({...newItem, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="icon">Icon Name</Label>
                <div className="flex items-center gap-2">
                  <Input id="icon" value={newItem.icon} onChange={e => setNewItem({...newItem, icon: e.target.value})} placeholder="Lucide icon name" />
                  <div className="h-10 w-10 border rounded flex items-center justify-center shrink-0">
                    <DynamicIcon icon={newItem.icon || 'Package'} />
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Briefly describe the item usage..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancel</Button>
            <Button onClick={handleAddItem}>Save Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isManagingCategories} onOpenChange={setIsManagingCategories}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stock Categories</DialogTitle>
            <DialogDescription>Create and organize your inventory groupings.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input 
                placeholder="New category name..." 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} size="sm">Add</Button>
            </div>
            <ScrollArea className="h-64 border rounded-md p-2">
              <div className="space-y-2">
                {(stockSettings?.categories || []).map(cat => (
                  <div key={cat} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50 group">
                    <span className="text-sm font-medium">{cat}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100" onClick={() => handleDeleteCategory(cat)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManagingCategories(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{adjustment.type === 'In' ? 'Add Stock' : 'Use Stock'}</DialogTitle>
            <DialogDescription>
              {adjustment.type === 'In' ? 'Increase quantity through purchase or restock.' : 'Decrease quantity for production or maintenance.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg">
              <div className="h-12 w-12 rounded-md bg-background flex items-center justify-center border shadow-sm">
                <DynamicIcon icon={stockItems.find(i => i.id === adjustment.itemId)?.icon || 'Package'} className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold">{stockItems.find(i => i.id === adjustment.itemId)?.name}</p>
                <p className="text-xs text-muted-foreground">Current: {stockItems.find(i => i.id === adjustment.itemId)?.currentQuantity} {stockItems.find(i => i.id === adjustment.itemId)?.unit}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="qty">Quantity to {adjustment.type === 'In' ? 'add' : 'use'} ({stockItems.find(i => i.id === adjustment.itemId)?.unit})</Label>
              <Input id="qty" type="number" min="1" value={adjustment.quantity} onChange={e => setAdjustment({...adjustment, quantity: Number(e.target.value)})} />
            </div>

            {adjustment.type === 'Out' && (
              <div className="grid gap-2">
                <Label htmlFor="order">Link to Order (Optional)</Label>
                <Select value={adjustment.orderId} onValueChange={v => setAdjustment({...adjustment, orderId: v})}>
                  <SelectTrigger><SelectValue placeholder="Search active orders..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Shop Use</SelectItem>
                    {orders.filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status)).map(o => (
                      <SelectItem key={o.id} value={o.id}>{formatOrderUniqueName(o.customerName, o.products, o.id)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid gap-2">
              <Label htmlFor="reason">Note / Reason</Label>
              <Input id="reason" value={adjustment.reason} onChange={e => setAdjustment({...adjustment, reason: e.target.value})} placeholder={adjustment.type === 'In' ? 'Supplier name, PO #...' : 'Specific component, waste...'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjusting(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock}>Confirm Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}