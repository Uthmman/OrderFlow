
"use client";

import { useState, use } from "react";
import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { notFound } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Order, OrderAttachment } from "@/lib/types";
import { formatOrderId } from "@/lib/utils";
import { ColorSettingProvider } from "@/hooks/use-color-settings";
import { ProductSettingProvider } from "@/hooks/use-product-settings";

export default function EditOrderPage({ params }: { params: { id: string } }) {
  const { id } = use(params);
  const { getOrderById, updateOrder, loading } = useOrders();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // The hook returns the order, but it might be undefined initially while loading.
  const order = getOrderById(id);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    notFound();
  }

  const handleUpdateOrder = async (updatedOrderData: Omit<Order, 'id' | 'creationDate'>) => {
    setIsSubmitting(true);
    try {
        await updateOrder({ ...order, ...updatedOrderData});
        toast({
            title: "Order Updated",
            description: `Order ${formatOrderId(order.id)} has been successfully updated.`,
        });
        // The form will reset its dirty state inside the OrderForm component.
    } catch (error) {
        console.error("Failed to update order", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: (error as Error).message || "There was a problem updating the order.",
        });
    } finally {
        setIsSubmitting(false);
    }
    return Promise.resolve(order.id);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Edit Order {formatOrderId(order.id)}
        </h1>
        <p className="text-muted-foreground">
          Update the details of the order below.
        </p>
      </div>
      <ColorSettingProvider>
        <ProductSettingProvider>
            <OrderForm
                order={order}
                onSave={(data) => handleUpdateOrder(data)}
                submitButtonText="Save Changes"
                isSubmitting={isSubmitting}
            />
        </ProductSettingProvider>
      </ColorSettingProvider>
    </div>
  );
}
