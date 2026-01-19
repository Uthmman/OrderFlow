

"use client";

import { useState } from "react";
import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { notFound, useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Order } from "@/lib/types";
import { formatOrderId } from "@/lib/utils";

export default function EditOrderPage() {
  const params = useParams();
  const id = params.id as string;
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
        const fullOrderData = { ...order, ...updatedOrderData };
        await updateOrder(fullOrderData);
        toast({
            title: "Order Updated",
            description: `Order ${formatOrderId(order.id)} has been successfully updated.`,
        });
        router.push(`/orders/${order.id}`);
        return order.id;
    } catch (error) {
        console.error("Failed to update order", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: (error as Error).message || "There was a problem updating the order.",
        });
        return undefined;
    } finally {
        setIsSubmitting(false);
    }
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
      <OrderForm
          order={order}
          onSave={handleUpdateOrder}
          submitButtonText="Save Changes"
          isSubmitting={isSubmitting}
      />
    </div>
  );
}
