

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);


  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => {
      const matchesSearch = product.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? true;
      return matchesSearch;
    });
  }, [products, searchTerm]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
        'All Products': products.length,
        'Custom': 0,
    };
    
    productSettings?.productCategories.forEach(cat => {
        counts[cat.name] = 0;
    });

    products.forEach(product => {
        if (product.category && counts.hasOwnProperty(product.category)) {
            counts[product.category]++;
        } else {
            counts['Custom']++;
        }
    });

    return counts;
  }, [products, productSettings]);

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
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Product Catalog</h1>
        <p className="text-muted-foreground">Browse and manage all available products.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Search all products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
            />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            {role === 'Admin' && (
                <Button variant="outline" size="sm" onClick={handleSync} disabled={isSyncing} className="flex-1 sm:flex-initial">
                    {isSyncing ? <Loader2 className="mr-2 animate-spin"/> : <RefreshCw className="mr-2"/>}
                    Sync
                </Button>
            )}
            <Button onClick={() => router.push('/products/new')} className="flex-1 sm:flex-initial">
                <PlusCircle className="mr-2" /> New Product
            </Button>
        </div>
      </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {categoryList.map(cat => {
            const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Box;
            const count = categoryCounts[cat.name] || 0;
            const link = cat.name === 'All Products' ? '/products' : `/products/category/${encodeURIComponent(cat.name)}`;
            
            // For "All Products", we don't need a category page, we are already on it. But we still show the card.
            const CardComponent = cat.name === 'All Products' ? 'div' : Link;
            const cardProps = cat.name === 'All Products' ? {} : { href: link };

            return (
              <CardComponent key={cat.name} {...cardProps}>
                <Card className={cn("hover:border-primary transition-colors group h-full", cat.name !== 'All Products' && 'cursor-pointer')}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                        <IconComponent className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                        {count > 0 && (
                             <div className="bg-primary text-primary-foreground h-7 w-7 rounded-full flex items-center justify-center text-sm font-bold">
                                {count}
                            </div>
                        )}
                    </div>
                     <div className="mt-4">
                        <p className="text-lg font-semibold">{cat.name}</p>
                        <p className="text-sm text-muted-foreground">View all products</p>
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
        <ProductProvider>
            <OrderProvider>
                <ProductSettingProvider>
                    <ProductCatalog />
                </ProductSettingProvider>
            </OrderProvider>
        </ProductProvider>
    )
}
