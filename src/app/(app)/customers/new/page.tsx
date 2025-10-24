
"use client";

import { useState } from "react";
import { CustomerForm } from "@/components/app/customer-form";
import { useCustomers } from "@/hooks/use-customers";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import type { Customer } from "@/lib/types";

export default function NewCustomerPage() {
  const { addCustomer } = useCustomers();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateCustomer = async (
    customerData: Omit<Customer, "id" | "ownerId" | "orderIds" | "reviews">
  ) => {
    setIsSubmitting(true);
    try {
      const newCustomerId = await addCustomer(customerData);
      toast({
        title: "Customer Created",
        description: `${customerData.name} has been successfully added.`,
      });
      router.push(`/customers/${newCustomerId}`);
    } catch (error) {
      console.error("Failed to create customer:", error);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: "There was a problem creating the customer.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Create New Customer
        </h1>
        <p className="text-muted-foreground">
          Fill out the form below to add a new customer to the system.
        </p>
      </div>
      <CustomerForm onSubmit={handleCreateCustomer} isSubmitting={isSubmitting} />
    </div>
  );
}

    