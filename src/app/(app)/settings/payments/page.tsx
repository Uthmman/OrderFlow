
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, PlusCircle } from "lucide-react";
import { usePaymentSettings } from "@/hooks/use-payment-settings";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { v4 as uuidv4 } from "uuid";

const methodSchema = z.object({
  name: z.string().min(1, "Method name is required"),
});

const bankSchema = z.object({
  bankName: z.string().min(1, "Bank name is required"),
  accountNumber: z.string().min(1, "Account number is required"),
});

export default function PaymentSettingsPage() {
  const { settings, loading, addMethod, deleteMethod, addBank, deleteBank } = usePaymentSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const methodForm = useForm({
    resolver: zodResolver(methodSchema),
    defaultValues: { name: "" },
  });

  const bankForm = useForm({
    resolver: zodResolver(bankSchema),
    defaultValues: { bankName: "", accountNumber: "" },
  });

  const handleAddMethod = async (data: { name: string }) => {
    setIsSubmitting(true);
    await addMethod(data.name);
    methodForm.reset();
    setIsSubmitting(false);
  };

  const handleAddBank = async (data: { bankName: string; accountNumber: string }) => {
    setIsSubmitting(true);
    await addBank({ ...data, id: uuidv4() });
    bankForm.reset();
    setIsSubmitting(false);
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Payment Settings</h1>
        <p className="text-muted-foreground">Manage payment methods and official bank accounts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Available options for order payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Form {...methodForm}>
              <form onSubmit={methodForm.handleSubmit(handleAddMethod)} className="flex items-end gap-2">
                <FormField
                  control={methodForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="flex-grow">
                      <FormLabel>Method Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Mobile Money" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" size="icon" disabled={isSubmitting}><PlusCircle className="h-4 w-4" /></Button>
              </form>
            </Form>
            <Separator />
            <div className="space-y-2">
              {settings?.methods.map(m => (
                <div key={m} className="flex justify-between items-center p-3 border rounded-md bg-muted/30">
                  <span className="font-medium">{m}</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteMethod(m)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bank Accounts</CardTitle>
            <CardDescription>Add bank details for customer transfers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             <Form {...bankForm}>
              <form onSubmit={bankForm.handleSubmit(handleAddBank)} className="space-y-4 bg-muted/20 p-4 rounded-lg">
                <FormField
                  control={bankForm.control}
                  name="bankName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. CBE" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={bankForm.control}
                  name="accountNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl><Input {...field} placeholder="0000000000" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Bank Account
                </Button>
              </form>
            </Form>
            <Separator />
            <div className="space-y-3">
              {settings?.banks.map(b => (
                <div key={b.id} className="flex justify-between items-center p-3 border rounded-md">
                  <div>
                    <p className="font-bold">{b.bankName}</p>
                    <p className="text-xs text-muted-foreground">{b.accountNumber}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteBank(b.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
