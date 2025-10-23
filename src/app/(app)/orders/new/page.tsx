"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";

export default function NewOrderPage() {
  const { addOrder } = useOrders();
  const router = useRouter();

  const handleCreateOrder = (newOrder: Order) => {
    addOrder(newOrder);
    router.push("/orders");
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Create New Order
        </h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new order to the system.
        </p>
      </div>
      <OrderForm onSubmit={handleCreateOrder} />
    </div>
  );
}
