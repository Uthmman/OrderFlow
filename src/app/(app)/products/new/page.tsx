
"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductForm } from "@/components/app/product-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Product } from "@/lib/types";

export default function NewProductPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addProduct } = useProducts();
  const { toast } = useToast();
  const router = useRouter();

  const handleCreateProduct = async (productData: Partial<Product>) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...productData,
        isStandard: true,
      };
      const newId = await addProduct(payload);
      if (newId) {
        toast({
          title: "Product Created",
          description: "New item added to the catalog.",
        });
        router.push(`/products/${newId}`);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not create the product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <ProductForm 
        title="Create New Product" 
        onSubmit={handleCreateProduct} 
        isSubmitting={isSubmitting} 
      />
    </div>
  );
}
