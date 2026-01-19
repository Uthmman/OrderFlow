
"use client";

import { useState, Suspense } from "react";
import { useProducts } from "@/hooks/use-products";
import { OrderForm } from "@/components/app/order-form";
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
      <OrderForm 
          onSave={handleSaveProduct}
          isSubmitting={isSubmitting} 
          isProductCreationMode={true}
      />
    </div>
  );
}


export default function NewProductPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewProductPageContent />
        </Suspense>
    )
}
