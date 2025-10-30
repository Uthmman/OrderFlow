
"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order, OrderAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, Suspense } from "react";
import { ColorSettingProvider } from "@/hooks/use-color-settings";


function NewOrderPageContent() {
  const { addOrder } = useOrders();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateOrder = (newOrderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[], filesToDelete: OrderAttachment[] = [], isDraft: boolean = false) => {
    setIsSubmitting(true);
    addOrder(newOrderData, newFiles, isDraft).then((newId) => {
        toast({
            title: isDraft ? "Draft Saved" : "Order Created",
            description: isDraft ? "Your order draft has been saved." : `New order has been added.`,
        });
        if (isDraft) {
            router.push('/orders');
        } else {
            router.push(`/orders/${newId}`);
        }
    }).catch((error) => {
        console.error("Failed to create order:", error);
        toast({
            variant: "destructive",
            title: isDraft ? "Draft Failed" : "Creation Failed",
            description: "There was a problem saving the order.",
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
          Fill out the form below to add a new order to the system.
        </p>
      </div>
      <ColorSettingProvider>
        <OrderForm onSubmit={handleCreateOrder} isSubmitting={isSubmitting} />
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

    