
"use client";

import { use } from "react";
import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { notFound } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";

export default function EditOrderPage({ params }: { params: { id: string } }) {
  const { id } = use(Promise.resolve(params));
  const { getOrderById, updateOrder } = useOrders();
  const { toast } = useToast();
  const router = useRouter();

  const order = getOrderById(id);

  if (!order) {
    notFound();
  }

  const handleUpdateOrder = (updatedOrder: Order) => {
    updateOrder(updatedOrder);
    toast({
      title: "Order Updated",
      description: `Order ${updatedOrder.id} has been successfully updated.`,
    });
    router.push(`/orders/${updatedOrder.id}`);
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Edit Order {order.id}
        </h1>
        <p className="text-muted-foreground">
          Update the details of the order below.
        </p>
      </div>
      <OrderForm
        order={order}
        onSubmit={handleUpdateOrder}
        submitButtonText="Save Changes"
      />
    </div>
  );
}
