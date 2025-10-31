
"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order, OrderAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, Suspense, useEffect } from "react";
import { ColorSettingProvider } from "@/hooks/use-color-settings";


function NewOrderPageContent() {
  const { addOrder } = useOrders();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => {
    setIsSubmitting(true);

    addOrder(orderData, newFiles).then((orderId) => {
        if (orderId) {
            toast({
                title: "Order Created",
                description: `Order #${orderId.slice(-5)} has been successfully created.`,
            });
            router.push(`/orders/${orderId}/edit`);
        }
    }).catch((error) => {
        console.error("Failed to save order:", error);
        toast({
            variant: "destructive",
            title: "Creation Failed",
            description: (error as Error).message || "There was a problem creating the order.",
        });
    }).finally(() => {
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
          Fill out the form below to add a new order. Your changes will be saved automatically.
        </p>
      </div>
      <ColorSettingProvider>
        <OrderForm 
            onSubmit={handleSubmitOrder} 
            isSubmitting={isSubmitting} 
            submitButtonText="Create Order"
        />
      </ColorSettingProvider>
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

    