

"use client";

import React, { useState, useMemo } from 'react';
import { useProducts, ProductProvider } from '@/hooks/use-products';
import { useProductSettings, ProductSettingProvider } from '@/hooks/use-product-settings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Search, LayoutGrid, List, Loader2, RefreshCw, Trash2, Package } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { OrderProvider, useOrders } from '@/hooks/use-orders';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Product } from '@/lib/types';


function ProductCatalog() {
  const { products, loading: productsLoading, syncProductsFromOrders, deleteProducts } = useProducts();
  const { orders, loading: ordersLoading } = useOrders();
  const { productSettings, loading: settingsLoading } = useProductSettings();
  const { user, role } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);


  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => {
      const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
      const matchesSearch = product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
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
  
  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
        prev.includes(productId) 
            ? prev.filter(id => id !== productId)
            : [...prev, productId]
    );
  };
  
  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
        const productsToDelete = products.filter(p => selectedProducts.includes(p.id));
        await deleteProducts(productsToDelete);
        toast({
            title: "Products Deleted",
            description: `${selectedProducts.length} product(s) have been removed from the catalog.`
        });
        setSelectedProducts([]);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: (error as Error).message || "An error occurred while deleting products.",
        });
    } finally {
        setIsDeleting(false);
    }
  }
  
  const handleSelectAll = () => {
    if(selectedProducts.length === filteredProducts.length) {
        setSelectedProducts([]);
    } else {
        setSelectedProducts(filteredProducts.map(p => p.id));
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
          
           <div className="space-y-4 mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={cn("px-4 py-2 text-sm font-medium border rounded-full transition-colors", 
                            selectedCategory === 'All' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                        )}
                    >
                        All Categories
                    </button>
                    {productSettings?.productCategories.map(cat => {
                         const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Box;
                         return (
                            <Link
                                href={`/products/category/${encodeURIComponent(cat.name)}`}
                                key={cat.name}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.push(`/products/category/${encodeURIComponent(cat.name)}`);
                                }}
                                className={cn("flex items-center gap-2 px-4 py-2 text-sm font-medium border rounded-full transition-colors", 
                                    selectedCategory === cat.name ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                                )}
                            >
                                <IconComponent className="h-4 w-4" />
                                {cat.name}
                            </Link>
                         )
                    })}
                </div>
            </div>

            {role === 'Admin' && (
                <div className="flex items-center gap-4 mb-6 p-3 bg-muted rounded-lg">
                    <Checkbox
                        id="select-all"
                        checked={selectedProducts.length > 0 && selectedProducts.length === filteredProducts.length}
                        onCheckedChange={handleSelectAll}
                    />
                    <label htmlFor="select-all" className="text-sm font-medium">
                        {selectedProducts.length > 0 ? `${selectedProducts.length} selected` : 'Select All'}
                    </label>
                    {selectedProducts.length > 0 && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" disabled={isDeleting}>
                                {isDeleting ? <Loader2 className="mr-2 animate-spin"/> : <Trash2 className="mr-2" />}
                                Delete Selected
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the selected products and their data.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteSelected}>Delete Products</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    )}
                </div>
            )}


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
                    const isSelected = selectedProducts.includes(product.id);

                    return (
                        <Card key={product.id} className={cn("flex flex-col overflow-hidden group h-full transition-all", isSelected && "ring-2 ring-primary")}>
                            <div className="relative">
                                {role === 'Admin' && (
                                     <div className="absolute top-2 left-2 z-10 bg-background/80 rounded-sm">
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => handleProductSelect(product.id)}
                                            className="m-1"
                                        />
                                    </div>
                                )}
                                 {(product.orderIds?.length || 0) > 0 && (
                                    <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold">
                                        {product.orderIds?.length}
                                    </div>
                                )}
                                <Link href={`/products/${product.id}`} className="block group-hover:opacity-80 transition-opacity">
                                    <CardHeader className="p-0">
                                        <div className="aspect-video bg-muted flex items-center justify-center relative overflow-hidden">
                                            {primaryAttachment?.url ? (
                                                <Image src={primaryAttachment.url} alt={product.productName} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                            ) : (
                                                <IconComponent className="h-16 w-16 text-muted-foreground" />
                                            )}
                                        </div>
                                    </CardHeader>
                                </Link>
                            </div>
                            <Link href={`/products/${product.id}`} className="flex-grow flex flex-col">
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
                    const isSelected = selectedProducts.includes(product.id);

                    return (
                        <Card key={product.id} className={cn("transition-colors hover:bg-muted/50", isSelected && "ring-2 ring-primary")}>
                          <div className="flex items-center p-4 gap-4">
                             {role === 'Admin' && (
                                <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => handleProductSelect(product.id)}
                                />
                             )}
                            <Link href={`/products/${product.id}`} className="flex-grow flex items-center gap-4">
                                <div className="h-16 w-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0 relative">
                                {primaryAttachment?.url ? (
                                        <Image src={primaryAttachment.url} alt={product.productName} fill className="object-cover rounded-md" />
                                    ) : (
                                        <IconComponent className="h-8 w-8 text-muted-foreground" />
                                    )}
                                     {(product.orderIds?.length || 0) > 0 && (
                                        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold">
                                            {product.orderIds?.length}
                                        </div>
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
