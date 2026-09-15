"use client";

import { useState, Suspense } from "react";
import { useProducts } from "@/hooks/use-products";
import { OrderForm } from "@/components/app/order-form";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useParams, notFound } from "next/navigation";
import { Order } from "@/lib/types";
import { Loader2 } from "lucide-react";

function EditProductPageContent() {
  const params = useParams();
  const id = params.id as string;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getProductById, updateProduct, loading } = useProducts();
  const { toast } = useToast();
  const router = useRouter();

  const product = getProductById(id);

  if (loading) {
      return <div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;
  }

  if (!product) {
      notFound();
  }

  // Wrap product in a minimal order object for the form
  const orderWrapper: any = {
      id: 'dummy',
      products: [product],
      customerId: '',
      customerName: 'Internal Catalog',
      status: 'Pending',
      deadline: new Date(),
      creationDate: new Date(),
      incomeAmount: product.price || 0,
      isUrgent: false,
      ownerId: '',
      assignedTo: [],
      location: { town: '' }
  };

  const handleSaveProduct = async (formData: Omit<Order, 'id' | 'creationDate'>) => {
      setIsSubmitting(true);
      try {
        const productData = formData.products[0];
        await updateProduct(id, productData);
        toast({
            title: "Product Updated",
            description: `${productData.productName} has been successfully updated.`,
        });
        router.push(`/products/${id}`);
        return id;
      } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not update the product.'
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
          Edit {product.productName}
        </h1>
        <p className="text-muted-foreground">
          Update the specifications and images for this catalog item.
        </p>
      </div>
      <OrderForm 
          order={orderWrapper}
          onSave={handleSaveProduct}
          isSubmitting={isSubmitting} 
          isProductCreationMode={true}
          submitButtonText="Save Product Changes"
      />
    </div>
  );
}

export default function EditProductPage() {
    return (
        <Suspense fallback={<div className="flex justify-center py-20"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>}>
            <EditProductPageContent />
        </Suspense>
    )
}
