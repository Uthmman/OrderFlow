
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
import { useState } from "react";
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


const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  company: z.string().optional(),
  phone: z.string().min(5, "A primary phone number is required."),
  phone2: z.string().optional(),
  telegram: z.string().optional(),
  gender: z.enum(["Male", "Female", "Other"]),
  town: z.string().min(2, "Town/City is required."),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

type CustomerFormValues = z.infer<typeof formSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: any) => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

export function CustomerForm({
  customer,
  onSubmit,
  submitButtonText = "Create Customer",
  isSubmitting = false,
}: CustomerFormProps) {
  const router = useRouter();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: customer
      ? {
          name: customer.name,
          email: customer.email,
          company: customer.company,
          phone: customer.phoneNumbers.find(p => p.type === 'Mobile')?.number || "",
          phone2: customer.phoneNumbers.find(p => p.type === 'Secondary')?.number || "",
          telegram: customer.telegram,
          gender: customer.gender,
          town: customer.location.town,
          lat: customer.location.mapCoordinates.lat,
          lng: customer.location.mapCoordinates.lng
        }
      : {
          gender: "Other",
          lat: 0,
          lng: 0,
        },
  });

  const { formState: { isDirty } } = form;

  const handleFormSubmit = (values: CustomerFormValues) => {
    const phoneNumbers = [{ type: 'Mobile' as const, number: values.phone }];
    if (values.phone2) {
        phoneNumbers.push({ type: 'Secondary' as const, number: values.phone2 });
    }

    const customerData = {
        name: values.name,
        email: values.email,
        company: values.company,
        telegram: values.telegram,
        gender: values.gender,
        phoneNumbers,
        location: {
            town: values.town,
            mapCoordinates: { lat: values.lat || 0, lng: values.lng || 0 }
        },
        avatarUrl: `https://i.pravatar.cc/150?u=${values.email || values.name}`
    };
    onSubmit(customerData);
  };
  
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      router.back();
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Customer Information</CardTitle>
                    <CardDescription>Enter the details for the new customer.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                                        <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Email Address (Optional)</FormLabel>
                            <FormControl>
                                <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="company"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Company (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Acme Inc." {...field} />
                            </FormControl>
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
                        name="phone2"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Secondary Phone (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. +1 555-987-6543" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="telegram"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Telegram (Optional)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. @jane.doe" {...field} />
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
                     <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="lat"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Latitude (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g. 34.0522" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="lng"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Longitude (Optional)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="e.g. -118.2437" {...field} />
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={handleCancelClick}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitButtonText}
                </Button>
            </div>
        </form>
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
                <AlertDialogAction onClick={() => router.back()}>
                    Discard changes
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
