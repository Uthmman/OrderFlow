"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order } from "@/lib/types";
import { useUser } from "@/firebase";
import { useToast } from "@/hooks/use-toast";


export default function NewOrderPage() {
  const { addOrder } = useOrders();
  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateOrder = (newOrderData: Omit<Order, 'id' | 'creationDate'>) => {
    if (!user) {
        toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You must be logged in to create an order.",
        });
        return;
    }
    
    addOrder(newOrderData).then((newId) => {
        toast({
            title: "Order Created",
            description: `New order ${newId} has been added.`,
        });
        router.push("/orders");
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
      <OrderForm onSubmit={handleCreateOrder} />
    </div>
  );
}
