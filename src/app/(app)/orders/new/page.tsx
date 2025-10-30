
"use client";

import { OrderForm } from "@/components/app/order-form";
import { useOrders } from "@/hooks/use-orders";
import { useRouter } from "next/navigation";
import { Order, OrderAttachment } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useState, Suspense, useEffect } from "react";
import { ColorSettingProvider } from "@/hooks/use-color-settings";


function NewOrderPageContent() {
  const { addOrder, updateOrder } = useOrders();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear any stray draft IDs when mounting the new order page
  useEffect(() => {
    localStorage.removeItem('orderDraftId');
  }, []);


  const handleSubmitOrder = (orderData: Omit<Order, 'id' | 'creationDate'>, newFiles: File[], filesToDelete: OrderAttachment[] = [], isDraft: boolean = false) => {
    setIsSubmitting(true);

    const promise = 'id' in orderData && orderData.id 
        ? updateOrder(orderData as Order, newFiles, filesToDelete, undefined, isDraft)
        : addOrder(orderData, newFiles, isDraft);

    promise.then((result) => {
        const orderId = typeof result === 'string' ? result : (orderData as Order).id;
        toast({
            title: isDraft ? "Draft Saved" : "Order Submitted",
            description: isDraft ? `Your draft has been saved.` : `Order #${orderId?.slice(-5)} has been successfully submitted.`,
        });
        if (!isDraft) {
            router.push(`/orders/${orderId}`);
        }
    }).catch((error) => {
        console.error("Failed to save order:", error);
        toast({
            variant: "destructive",
            title: isDraft ? "Draft Failed" : "Submission Failed",
            description: (error as Error).message || "There was a problem saving the order.",
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
          Fill out the form below to add a new order to the system. Your progress is saved automatically as a draft.
        </p>
      </div>
      <ColorSettingProvider>
        <OrderForm 
            onSubmit={handleSubmitOrder} 
            isSubmitting={isSubmitting} 
            submitButtonText="Submit Order"
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

    