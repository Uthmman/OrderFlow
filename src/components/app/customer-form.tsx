

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import type { Customer } from "@/lib/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "../ui/textarea";


const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phone: z.string().min(5, "A primary phone number is required."),
  gender: z.enum(["Male", "Female"]),
  town: z.string().min(2, "Town/City is required."),
  notes: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: any) => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
  onCancel?: () => void;
}

export function CustomerForm({
  customer,
  onSubmit,
  submitButtonText = "Create Customer",
  isSubmitting = false,
  onCancel,
}: CustomerFormProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const getInitialValues = () => {
    if (customer) {
      return {
          name: customer.name,
          phone: customer.phoneNumbers.find(p => p.type === 'Mobile')?.number || "",
          gender: customer.gender === 'Other' ? 'Female' : customer.gender, // Default to Female if 'Other'
          town: customer.location.town,
          notes: customer.notes,
        };
    }
    
    return {
          name: "",
          phone: "",
          gender: "Female",
          town: "",
          notes: "",
        };
  }

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(),
  });
  
  const { formState: { isDirty } } = form;

  const handleFormSubmit = (values: CustomerFormValues) => {
    const phoneNumbers = [{ type: 'Mobile' as const, number: values.phone }];

    let avatarUrl;
    if (values.gender === 'Male') {
      avatarUrl = `https://avatar.iran.liara.run/public/boy?username=${values.name}`;
    } else {
      avatarUrl = `https://avatar.iran.liara.run/public/girl?username=${values.name}`;
    }


    const customerData = {
        name: values.name,
        gender: values.gender,
        notes: values.notes,
        phoneNumbers,
        location: {
            town: values.town,
        },
        avatarUrl,
    };
    onSubmit(customerData);
  };
  
  const handleCancelClick = () => {
    if (onCancel) {
      onCancel();
      return;
    }
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      router.back();
    }
  };

  const handleDiscard = () => {
    router.back();
  }

  const FormContent = (
    <>
        <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Jane Doe" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
         <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a gender" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Male">Male</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Primary Phone</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. +1 555-123-4567" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="town"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Town/City</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. San Francisco" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
        <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
                <FormItem className="md:col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                    <Textarea
                        placeholder="Add any internal notes about this customer..."
                        rows={4}
                        {...field}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
        />
    </>
  );

  return (
    <>
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FormContent}
        </div>
        <div className="flex justify-end gap-2 mt-8">
            <Button variant="outline" type="button" onClick={handleCancelClick}>Cancel</Button>
            <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleFormSubmit)}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
            </Button>
        </div>
    </Form>

    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to leave? Your changes will be lost.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Stay on page</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscard}>
                    Discard changes
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
