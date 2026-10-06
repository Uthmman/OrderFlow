"use client";

import React, { useState, useMemo, useTransition } from 'react';
import { useProducts } from '@/hooks/use-products';
import { useProductSettings } from '@/hooks/use-product-settings';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { useOrders } from '@/hooks/use-orders';
import { useUser } from '@/hooks/use-user';

function ProductCatalog() {
  const { products, loading: productsLoading } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const { productSettings, loading: settingsLoading } = useProductSettings();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'orders'>('standard');
  const [isPending, startTransition] = useTransition();

  const handleTabChange = (val: string) => {
    startTransition(() => { setActiveTab(val as any); });
  };

  const filteredProducts = useMemo(() => {
    const base = activeTab === 'standard' ? products.filter(p => p.isStandard) : products.filter(p => !p.isStandard);
    return base.filter(p => p.productName?.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, activeTab, searchTerm]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { 'All': filteredProducts.length };
    productSettings?.productCategories.forEach(cat => { counts[cat.name] = filteredProducts.filter(p => p.category === cat.name).length; });
    return counts;
  }, [filteredProducts, productSettings]);

  if (productsLoading || settingsLoading || ordersLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin opacity-20" /></div>;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start gap-4">
        <div><h1 className="text-3xl font-bold font-headline tracking-tight">Product Catalog</h1><p className="text-muted-foreground text-sm">Library of designs.</p></div>
        <Button onClick={() => router.push('/products/new')}><PlusCircle className="mr-2 h-4 w-4" /> New Product</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-muted/20 p-4 rounded-xl border">
        <Tabs value={activeTab} onValueChange={handleTabChange}><TabsList className="bg-background"><TabsTrigger value="standard">Catalog</TabsTrigger><TabsTrigger value="orders">Custom</TabsTrigger></TabsList></Tabs>
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 opacity-40" /><Input placeholder="Search..." className="pl-10 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div>
      </div>

       <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 transition-opacity duration-300">
          {(productSettings?.productCategories || []).map(cat => {
            const Icon = (LucideIcons as any)[cat.icon] || LucideIcons.Box;
            const count = categoryCounts[cat.name] || 0;
            return (
              <Link key={cat.name} href={`/products/category/${encodeURIComponent(cat.name)}?type=${activeTab}`}>
                <Card className="hover:border-primary transition-all group cursor-pointer active:scale-95">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-muted rounded-xl group-hover:bg-primary/10"><Icon className="h-6 w-6 text-muted-foreground group-hover:text-primary" /></div>
                        {count > 0 && <div className="bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold">{count}</div>}
                    </div>
                    <div className="mt-4"><p className="text-sm font-bold truncate">{cat.name}</p><p className="text-[8px] text-muted-foreground uppercase font-bold tracking-widest">{activeTab === 'standard' ? 'Standard' : 'Custom'}</p></div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
    </div>
  );
}

export default function ProductsPage() { return <ProductCatalog />; }
