
"use client";

import React, { useState, useMemo } from 'react';
import { useProducts, ProductProvider } from '@/hooks/use-products';
import { useProductSettings, ProductSettingProvider } from '@/hooks/use-product-settings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Search, LayoutGrid, List, Loader2, RefreshCw } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { OrderProvider, useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';

function ProductCatalog() {
  const { products, loading: productsLoading, syncProductsFromOrders } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const { productSettings, loading: settingsLoading } = useProductSettings();
  const { user, role } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSyncing, setIsSyncing] = useState(false);

  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchTerm]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
        const count = await syncProductsFromOrders(orders);
        toast({
            title: "Sync Complete",
            description: `${count} new products were added to the catalog.`,
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

  if (productsLoading || settingsLoading || ordersLoading) {
    return <div className="text-center p-8">Loading products...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground">Browse and manage all available products.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {productSettings?.productCategories.map(cat => (
                    <SelectItem key={cat.name} value={cat.name}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="flex items-center gap-2">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('grid')}>
                    <LayoutGrid />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('list')}>
                    <List />
                </Button>
                {role === 'Admin' && (
                    <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing}>
                        {isSyncing ? <Loader2 className="mr-2 animate-spin"/> : <RefreshCw className="mr-2"/>}
                        Sync
                    </Button>
                )}
                 <Button onClick={() => router.push('/products/new')}>
                    <PlusCircle className="mr-2" /> New Product
                </Button>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No products found.</p>
            </div>
          ) : viewMode === 'grid' ? (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => {
                    const category = productSettings?.productCategories.find(c => c.name === product.category);
                    const IconComponent = (LucideIcons as any)[category?.icon || 'Box'] || LucideIcons.Box;
                    const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];

                    return (
                        <Card key={product.id} className="flex flex-col overflow-hidden group h-full">
                            <Link href={`/products/${product.id}`} className="block group-hover:opacity-80 transition-opacity flex-grow flex flex-col">
                                <CardHeader className="p-0">
                                    <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                                        {primaryAttachment?.url ? (
                                            <Image src={primaryAttachment.url} alt={product.productName} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                        ) : (
                                            <IconComponent className="h-16 w-16 text-muted-foreground" />
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 flex-grow">
                                    <CardTitle className="text-base font-bold group-hover:underline">{product.productName}</CardTitle>
                                    <CardDescription>{product.category}</CardDescription>
                                </CardContent>
                            </Link>
                            <CardFooter className="p-4 pt-0">
                                <Button className="w-full" size="sm" onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)}>
                                    <PlusCircle className="mr-2"/> Order This
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
          ) : (
            <div className="space-y-4">
                {filteredProducts.map(product => {
                    const category = productSettings?.productCategories.find(c => c.name === product.category);
                    const IconComponent = (LucideIcons as any)[category?.icon || 'Box'] || LucideIcons.Box;
                    const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];
                    return (
                        <Card key={product.id} className="transition-colors hover:bg-muted/50">
                          <div className="flex items-center p-4 gap-4">
                            <Link href={`/products/${product.id}`} className="flex-grow flex items-center gap-4">
                                <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0 relative">
                                {primaryAttachment?.url ? (
                                        <Image src={primaryAttachment.url} alt={product.productName} fill className="object-cover rounded-md" />
                                    ) : (
                                        <IconComponent className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <p className="font-semibold hover:underline">{product.productName}</p>
                                    <p className="text-sm text-muted-foreground">{product.category}</p>
                                </div>
                            </Link>
                             <Button size="sm" onClick={() => router.push(`/orders/new?fromProduct=${product.id}`)}>
                                <PlusCircle className="mr-2"/> Order
                            </Button>
                          </div>
                        </Card>
                    )
                })}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

export default function ProductsPage() {
    return (
        <ProductProvider>
            <OrderProvider>
                <ProductSettingProvider>
                    <ProductCatalog />
                </ProductSettingProvider>
            </OrderProvider>
        </ProductProvider>
    )
}
