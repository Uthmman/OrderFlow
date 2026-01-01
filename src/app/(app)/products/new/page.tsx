
"use client";

import { useState, Suspense } from "react";
import { ProductProvider } from "@/hooks/use-products";
import { ProductSettingProvider } from "@/hooks/use-product-settings";
import { OrderForm } from "@/components/app/order-form";
import { ColorSettingProvider } from "@/hooks/use-color-settings";


function NewProductPageContent() {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
