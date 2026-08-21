
"use client";

import React, { useState, useMemo } from 'react';
import { useProducts } from '@/hooks/use-products';
import { useProductSettings } from '@/hooks/use-product-settings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Search, LayoutGrid, Loader2, RefreshCw, Box, Library, Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Product } from '@/lib/types';


function ProductCatalog() {
  const { products, loading: productsLoading, syncProductsFromOrders } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const { productSettings, loading: settingsLoading } = useProductSettings();
  const { role } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'standard' | 'orders'>('standard');
  const [isSyncing, setIsSyncing] = useState(false);

  // Filter products based on the active tab
  const filteredProductsByTab = useMemo(() => {
    if (activeTab === 'standard') {
      return products.filter(p => p.isStandard === true);
    }
    return products.filter(p => p.isStandard !== true);
  }, [products, activeTab]);

  // Apply search filtering
  const filteredProducts = useMemo(() => {
    return filteredProductsByTab.filter(product => {
      const matchesSearch = product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
      return matchesSearch;
    });
  }, [filteredProductsByTab, searchTerm]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
        'All Products': filteredProductsByTab.length,
        'Custom': 0,
    };
    
    productSettings?.productCategories.forEach(cat => {
        counts[cat.name] = 0;
    });

    filteredProductsByTab.forEach(product => {
        if (product.category && counts.hasOwnProperty(product.category)) {
            counts[product.category]++;
        } else {
            counts['Custom']++;
        }
    });

    return counts;
  }, [filteredProductsByTab, productSettings]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const count = await syncProductsFromOrders(orders);
        toast({
            title: "Sync Complete",
            description: `${count} new designs were synced from orders.`,
        });
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Sync Failed",
            description: "An error occurred while syncing products.",
        });
    } finally {
        setIsSyncing(false);
    }
  }

  const categoryList = [
      { name: 'All Products', icon: 'LayoutGrid' },
      ...(productSettings?.productCategories || []),
      { name: 'Custom', icon: 'Wrench' }
  ]


  if (productsLoading || settingsLoading || ordersLoading) {
    return <div className="text-center p-8">Loading products...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
            <h1 className="text-3xl font-bold font-headline tracking-tight">Product Catalog</h1>
            <p className="text-muted-foreground">Browse and manage all available products.</p>
        </div>
         <div className="flex items-center gap-2 w-full sm:w-auto">
            {role === 'Admin' && (
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="flex-1 sm:flex-initial h-9">
                    {isSyncing ? <Loader2 className="mr-2 animate-spin h-4 w-4"/> : <RefreshCw className="mr-2 h-4 w-4"/>}
                    Sync from Orders
                </Button>
            )}
            <Button onClick={() => router.push('/products/new')} className="flex-1 sm:flex-initial h-9">
                <PlusCircle className="mr-2 h-4 w-4" /> New Product
            </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-muted/30 p-4 rounded-lg">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="standard" className="flex items-center gap-2">
                    <Library className="h-4 w-4" /> Standard Catalog
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                    <Package className="h-4 w-4" /> Order Designs
                </TabsTrigger>
            </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search catalog..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full bg-background"
            />
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categoryList.map(cat => {
            const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Box;
            const count = categoryCounts[cat.name] || 0;
            const link = cat.name === 'All Products' ? '/products' : `/products/category/${encodeURIComponent(cat.name)}`;
            
            const CardComponent = cat.name === 'All Products' ? 'div' : Link;
            const cardProps = cat.name === 'All Products' ? {} : { href: link };

            return (
              <CardComponent key={cat.name} {...cardProps}>
                <Card className={cn("hover:border-primary transition-colors group h-full relative overflow-hidden", cat.name !== 'All Products' && 'cursor-pointer')}>
                   <div className="absolute top-0 right-0 h-16 w-16 -mr-8 -mt-8 bg-primary/5 rounded-full transition-all group-hover:bg-primary/10" />
                  <CardContent className="pt-6 relative">
                    <div className="flex justify-between items-start">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                            <IconComponent className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        {count > 0 && (
                             <div className="bg-primary text-primary-foreground h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold shadow-sm">
                                {count}
                            </div>
                        )}
                    </div>
                     <div className="mt-4">
                        <p className="text-lg font-bold font-headline">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                            {activeTab === 'standard' ? 'Standard products' : 'Custom order pieces'}
                        </p>
                    </div>
                  </CardContent>
                </Card>
              </CardComponent>
            )
          })}
        </div>
    </div>
  );
}

export default function ProductsPage() {
    return (
        <ProductCatalog />
    )
}
