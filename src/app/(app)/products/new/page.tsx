
"use client";

import { useState, Suspense } from "react";
import { ProductProvider, useProducts } from "@/hooks/use-products";
import { ProductSettingProvider } from "@/hooks/use-product-settings";
import { OrderForm } from "@/components/app/order-form";
import { ColorSettingProvider } from "@/hooks/use-color-settings";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";


function NewProductPageContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addProduct } = useProducts();
  const { toast } = useToast();
  const router = useRouter();


  const handleSaveProduct = async (productData: Omit<Order, 'id' | 'creationDate'>) => {
      setIsSubmitting(true);
      try {
        const productToCreate = productData.products[0];
        const newProductId = await addProduct(productToCreate);
        if (newProductId) {
            toast({
                title: "Product Created",
                description: `${productToCreate.productName} has been successfully created.`,
            });
            router.push(`/products/${newProductId}`);
        }
        return newProductId;
      } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not create the product.'
        });
        return undefined;
      } finally {
          setIsSubmitting(false);
      }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Create New Product
        </h1>
        <p className="text-muted-foreground">
          Follow the steps to add a new product to your catalog.
        </p>
      </div>
      <ColorSettingProvider>
        <ProductSettingProvider>
            <OrderForm 
                onSave={handleSaveProduct}
                isSubmitting={isSubmitting} 
                isProductCreationMode={true}
            />
        </ProductSettingProvider>
      </ColorSettingProvider>
    </div>
  );
}


export default function NewProductPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ProductProvider>
                <NewProductPageContent />
            </ProductProvider>
        </Suspense>
    )
}
