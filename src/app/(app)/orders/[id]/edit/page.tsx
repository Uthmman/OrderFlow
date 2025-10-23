

"use client";

import { useState, use } from "react";
import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { notFound } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { formatOrderId } from "@/lib/utils";

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

  const handleUpdateOrder = (updatedOrderData: Omit<Order, 'id' | 'creationDate'>) => {
    setIsSubmitting(true);
    updateOrder({ ...order, ...updatedOrderData}).then(() => {
        toast({
        title: "Order Updated",
        description: `Order ${formatOrderId(order.id)} has been successfully updated.`,
        });
        router.push(`/orders/${order.id}`);
    }).finally(() => {
        setIsSubmitting(false);
    });
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
        onSubmit={handleUpdateOrder}
        submitButtonText="Save Changes"
        isSubmitting={isSubmitting}
      />
    </div>
  );
}

    