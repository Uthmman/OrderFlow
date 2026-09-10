"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
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
import { Textarea } from "../ui/textarea";

const phoneSchema = z.object({
  type: z.enum(["Mobile", "Work", "Home", "Secondary"]),
  number: z.string().min(5, "Number is too short."),
});

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  phoneNumbers: z.array(phoneSchema).min(1, "At least one phone number is required."),
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
          phoneNumbers: customer.phoneNumbers.length > 0 ? customer.phoneNumbers : [{ type: 'Mobile' as const, number: "" }],
          gender: customer.gender === 'Other' ? 'Female' : customer.gender, 
          town: customer.location.town,
          notes: customer.notes || "",
        };
    }
    
    return {
          name: "",
          phoneNumbers: [{ type: 'Mobile' as const, number: "" }],
          gender: "Female" as const,
          town: "",
          notes: "",
        };
  }

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getInitialValues(),
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phoneNumbers",
  });

  const { formState: { isDirty } } = form;

  const handleFormSubmit = (values: CustomerFormValues) => {
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
        phoneNumbers: values.phoneNumbers,
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

  return (
    <>
      <Form {...form}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Jane Doe" {...field} value={field.value ?? ""} />
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
                            <Select onValueChange={field.onChange} value={field.value}>
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
                    name="town"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Town/City</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Addis Ababa" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                 <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Internal Notes</FormLabel>
                        <FormControl>
                            <Textarea
                                placeholder="Add any specific details about this customer..."
                                rows={4}
                                {...field}
                                value={field.value ?? ""}
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <FormLabel>Phone Numbers</FormLabel>
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => append({ type: 'Mobile', number: "" })}
                        className="h-8 text-xs"
                    >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Phone
                    </Button>
                </div>
                
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2">
                             <FormField
                                control={form.control}
                                name={`phoneNumbers.${index}.type`}
                                render={({ field }) => (
                                    <FormItem className="w-32 shrink-0">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger className="h-10"><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="Mobile">Mobile</SelectItem>
                                                <SelectItem value="Work">Work</SelectItem>
                                                <SelectItem value="Home">Home</SelectItem>
                                                <SelectItem value="Secondary">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`phoneNumbers.${index}.number`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Input placeholder="Number..." {...field} value={field.value ?? ""} className="h-10" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {fields.length > 1 && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => remove(index)}
                                    className="h-10 w-10 text-destructive shrink-0"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
        
        <div className="flex justify-end gap-2 mt-10 pt-6 border-t">
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
                <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                <AlertDialogDescription>Are you sure you want to discard your changes?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Stay</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.back()}>Discard</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
