"use client";

import React, { useState } from 'react';
import { useStock } from '@/hooks/use-stock';
import { useOrders } from '@/hooks/use-orders';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, MinusCircle, History, Package, Search, AlertTriangle, ArrowUpDown, Trash2 } from 'lucide-react';
import { formatTimestamp, formatOrderId } from '@/lib/utils';
import type { StockItem, StockUnit, StockTransactionType } from '@/lib/types';

const STOCK_UNITS: StockUnit[] = ['pcs', 'kg', 'liter', 'meters', 'set', 'box', 'sheets', 'liters', 'grams'];

export default function StockPage() {
  const { stockItems, transactions, loading, addStockItem, adjustStock } = useStock();
  const { orders } = useOrders();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('inventory');

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', category: '', unit: 'pcs' as StockUnit });

  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustment, setAdjustment] = useState({ 
    itemId: '', 
    type: 'Out' as StockTransactionType, 
    quantity: 1, 
    reason: '', 
    orderId: '' 
  });

  const filteredItems = stockItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!newItem.name) return;
    await addStockItem(newItem);
    setNewItem({ name: '', category: '', unit: 'pcs' });
    setIsAddingItem(false);
  };

  const handleAdjustStock = async () => {
    if (!adjustment.itemId || adjustment.quantity <= 0) return;
    await adjustStock(adjustment);
    setAdjustment({ itemId: '', type: 'Out', quantity: 1, reason: '', orderId: '' });
    setIsAdjusting(false);
  };

  const openAdjustmentDialog = (item: StockItem, type: StockTransactionType) => {
    setAdjustment({ ...adjustment, itemId: item.id, type });
    setIsAdjusting(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">Keep track of materials, hardware, and supplies.</p>
        </div>
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Inventory Item</DialogTitle>
              <DialogDescription>Define a new item to track in your warehouse.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Item Name</Label>
                <Input id="name" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="e.g. White Wood Glue" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <Input id="category" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})} placeholder="e.g. Hardware" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Select value={newItem.unit} onValueChange={(v: StockUnit) => setNewItem({...newItem, unit: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STOCK_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddingItem(false)}>Cancel</Button>
              <Button onClick={handleAddItem}>Save Item</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="inventory"><Package className="mr-2 h-4 w-4" /> Stock Items</TabsTrigger>
          <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No inventory items found.</TableCell></TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell><Badge variant="outline">{item.category || 'N/A'}</Badge></TableCell>
                      <TableCell className="text-right">
                        <span className={cn("font-bold", item.currentQuantity <= (item.minQuantity || 0) && "text-destructive")}>
                          {item.currentQuantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.unit}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => openAdjustmentDialog(item, 'In')}>
                          <PlusCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openAdjustmentDialog(item, 'Out')}>
                          <MinusCircle className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason / Order</TableHead>
                  <TableHead>User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No transactions recorded yet.</TableCell></TableRow>
                ) : (
                  transactions.map(tx => {
                    const item = stockItems.find(i => i.id === tx.itemId);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground">{formatTimestamp(tx.timestamp)}</TableCell>
                        <TableCell className="font-medium">{item?.name || 'Deleted Item'}</TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'In' ? 'default' : 'secondary'}>{tx.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{tx.quantity}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {tx.orderId ? (
                            <span className="flex items-center gap-1 text-primary">
                               <Package className="h-3 w-3" /> {formatOrderId(tx.orderId)}
                            </span>
                          ) : (
                            tx.reason
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{tx.userName}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isAdjusting} onOpenChange={setIsAdjusting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{adjustment.type === 'In' ? 'Restock Item' : 'Use Stock'}</DialogTitle>
            <DialogDescription>
              {adjustment.type === 'In' 
                ? 'Add items back into the inventory.' 
                : 'Log material usage for an order or maintenance.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Item</Label>
              <Input value={stockItems.find(i => i.id === adjustment.itemId)?.name || ''} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="qty">Quantity ({stockItems.find(i => i.id === adjustment.itemId)?.unit})</Label>
              <Input id="qty" type="number" value={adjustment.quantity} onChange={e => setAdjustment({...adjustment, quantity: Number(e.target.value)})} />
            </div>
            {adjustment.type === 'Out' && (
              <div className="grid gap-2">
                <Label htmlFor="order">For Order (Optional)</Label>
                <Select value={adjustment.orderId} onValueChange={v => setAdjustment({...adjustment, orderId: v})}>
                  <SelectTrigger><SelectValue placeholder="Select an order..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General Usage (No Order)</SelectItem>
                    {orders.filter(o => !['Completed', 'Shipped', 'Cancelled'].includes(o.status)).map(o => (
                      <SelectItem key={o.id} value={o.id}>{formatOrderId(o.id)} - {o.customerName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason / Notes</Label>
              <Input id="reason" value={adjustment.reason} onChange={e => setAdjustment({...adjustment, reason: e.target.value})} placeholder="e.g. Regular restock, Production use..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjusting(false)}>Cancel</Button>
            <Button onClick={handleAdjustStock}>Confirm adjustment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
