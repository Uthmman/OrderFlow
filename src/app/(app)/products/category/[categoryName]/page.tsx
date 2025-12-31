
"use client";

import React, { useMemo } from 'react';
import { useParams, useRouter } from "next/navigation";
import { useProducts, ProductProvider } from '@/hooks/use-products';
import { useProductSettings, ProductSettingProvider } from '@/hooks/use-product-settings';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrderProvider } from '@/hooks/use-orders';

function CategoryProductCatalog() {
  const params = useParams();
  const categoryName = decodeURIComponent(params.categoryName as string);
  const router = useRouter();
  
  const { products, loading: productsLoading } = useProducts();
  const { productSettings, loading: settingsLoading } = useProductSettings();

  const filteredProducts = useMemo(() => {
    return (products || []).filter(product => product.category === categoryName);
  }, [products, categoryName]);

  const category = productSettings?.productCategories.find(c => c.name === categoryName);
  const IconComponent = (LucideIcons as any)[category?.icon || 'Box'] || LucideIcons.Box;

  if (productsLoading || settingsLoading) {
    return <div className="text-center p-8">Loading products...</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-4">
            <IconComponent className="h-10 w-10 text-muted-foreground" />
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">{categoryName}</h1>
                <p className="text-muted-foreground">Browse all products in this category.</p>
            </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/products')}>
            <ArrowLeft className="mr-2" /> Back to Full Catalog
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p>No products found in the "{categoryName}" category.</p>
            </div>
          ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredProducts.map(product => {
                    const primaryAttachment = product.attachments?.[0] || product.designAttachments?.[0];
                    return (
                        <Card key={product.id} className={cn("flex flex-col overflow-hidden group h-full transition-all")}>
                            <div className="relative">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}


export default function CategoryPage() {
    return (
        <ProductProvider>
            <OrderProvider>
                <ProductSettingProvider>
                    <CategoryProductCatalog />
                </ProductSettingProvider>
            </OrderProvider>
        </ProductProvider>
    )
}
