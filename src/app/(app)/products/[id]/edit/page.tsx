
"use client";

import { useState } from "react";
import { useProducts } from "@/hooks/use-products";
import { ProductForm } from "@/components/app/product-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, notFound } from "next/navigation";
import { Product } from "@/lib/types";
import { Loader2 } from "lucide-react";

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getProductById, updateProduct, loading } = useProducts();
  const { toast } = useToast();
  const router = useRouter();

  const product = getProductById(id);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  if (!product) {
    notFound();
  }

  const handleUpdateProduct = async (productData: Partial<Product>) => {
    setIsSubmitting(true);
    try {
      await updateProduct(id, productData);
      toast({
        title: "Product Updated",
        description: "The catalog item has been successfully modified.",
      });
      router.push(`/products/${id}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not update the product.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <ProductForm 
        title={`Edit ${product.productName}`}
        initialData={product}
        onSubmit={handleUpdateProduct}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
