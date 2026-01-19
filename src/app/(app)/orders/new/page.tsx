

"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order, OrderAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, Suspense, useEffect } from "react";
import { formatOrderId } from "@/lib/utils";

function NewOrderPageContent() {
  const { addOrder } = useOrders();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSaveOrder = async (orderData: Omit<Order, 'id' | 'creationDate'>, isNew: boolean) => {
    setIsSubmitting(true);
    
    try {
        const orderId = await addOrder(orderData, isNew);
        if (orderId) {
            toast({
                title: "Order Created",
                description: `Order ${formatOrderId(orderId)} has been successfully created.`,
            });
            // On successful creation, the form component will handle the redirect
            // to the edit page, so no need to router.push here unless it's a final save.
            if(orderData.status !== 'Pending') {
               router.push(`/orders/${orderId}`);
            }
        } else {
             throw new Error("Failed to get new order ID.");
        }
        return orderId;
    } catch (error) {
        console.error("Failed to save order:", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: (error as Error).message || "There was a problem creating the order.",
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
          Create New Order
        </h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new order.
        </p>
      </div>
      <OrderForm 
          onSave={handleSaveOrder} 
          isSubmitting={isSubmitting} 
          submitButtonText="Create Order"
      />
    </div>
  );
}


export default function NewOrderPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <NewOrderPageContent />
        </Suspense>
    )
}
