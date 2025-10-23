
"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";


export default function NewOrderPage() {
  const { addOrder } = useOrders();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrder = (newOrderData: Omit<Order, 'id' | 'creationDate'>) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to create an order.",
        });
        return;
    }
    
    setIsSubmitting(true);
    addOrder(newOrderData).then((newId) => {
        toast({
            title: "Order Created",
            description: `New order has been added.`,
        });
        router.push(`/orders/${newId}`);
    }).catch((error) => {
        console.error("Failed to create order:", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: "There was a problem creating the order.",
        });
        setIsSubmitting(false);
    });
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
      <OrderForm onSubmit={handleCreateOrder} isSubmitting={isSubmitting} />
    </div>
  );
}
