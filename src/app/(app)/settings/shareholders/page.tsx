
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useFinancialSettings } from "@/hooks/use-financial-settings";
import { Loader2, PlusCircle, Trash2, PieChart, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useUser } from "@/hooks/use-user";
import { cn } from "@/lib/utils";

const shareholderSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  percentage: z.coerce.number().min(0).max(100),
});

const financialFormSchema = z.object({
  shareholders: z.array(shareholderSchema),
});

type FinancialFormValues = z.infer<typeof financialFormSchema>;

export default function ShareholderSettingsPage() {
  const { settings, loading, updateShareholders } = useFinancialSettings();
  const { role } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canEdit = role === 'Admin';

  const form = useForm<FinancialFormValues>({
    resolver: zodResolver(financialFormSchema),
    values: {
      shareholders: settings?.shareholders || [],
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "shareholders",
  });

  const watchedShares = form.watch("shareholders");
  const totalPercentage = useMemo(() => {
    return watchedShares.reduce((sum, sh) => sum + (Number(sh.percentage) || 0), 0);
  }, [watchedShares]);

  const isOverLimit = totalPercentage > 100;

  const onSubmit = async (data: FinancialFormValues) => {
    if (!canEdit) return;
    if (totalPercentage > 100) {
      toast({ 
        variant: "destructive", 
        title: "Invalid Distribution", 
        description: "Total percentage cannot exceed 100%." 
      });
      return;
    }
    setIsSubmitting(true);
    await updateShareholders(data.shareholders);
    setIsSubmitting(false);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Shareholder Management</h1>
        <p className="text-muted-foreground">Manage profit distribution percentages for dashboard tracking.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-3-xl">
          <Card className="border-none shadow-xl">
            <CardHeader className="border-b pb-6 bg-slate-50/50">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-primary" /> Equity Distribution
                  </CardTitle>
                  <CardDescription>Allocate net profit shares among company owners.</CardDescription>
                </div>
                {canEdit && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => append({ id: uuidv4(), name: "", percentage: 0 })}
                        className="h-9 font-bold"
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Shareholder
                    </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
                <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-4 p-4 border rounded-xl bg-card hover:border-primary/30 transition-all group">
                             <FormField
                                control={form.control}
                                name={`shareholders.${index}.name`}
                                render={({ field }) => (
                                    <FormItem className="flex-grow">
                                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Shareholder Name</FormLabel>
                                        <FormControl><Input {...field} placeholder="Full Name" className="h-11" disabled={!canEdit} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`shareholders.${index}.percentage`}
                                render={({ field }) => (
                                    <FormItem className="w-32">
                                        <FormLabel className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Share %</FormLabel>
                                        <div className="relative">
                                            <FormControl><Input type="number" {...field} className="h-11 pr-8 font-bold" disabled={!canEdit} /></FormControl>
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {canEdit && (
                                <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-11 w-11 text-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-colors" 
                                    onClick={() => remove(index)}
                                >
                                    <Trash2 className="h-5 w-5" />
                                </Button>
                            )}
                        </div>
                    ))}

                    {fields.length === 0 && (
                        <div className="py-16 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                            <PieChart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                            <p className="text-sm font-bold text-muted-foreground">No shareholders added yet.</p>
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t">
                    <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl shadow-lg">
                        <div className="space-y-0.5">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Total Allocation</p>
                            <p className={cn("text-2xl font-black tabular-nums", isOverLimit && "text-red-400")}>
                                {totalPercentage}%
                            </p>
                        </div>
                        <div className="text-right">
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Remaining</p>
                             <p className="text-xl font-bold tabular-nums">
                                {Math.max(0, 100 - totalPercentage)}%
                             </p>
                        </div>
                    </div>

                    {isOverLimit && (
                        <Alert variant="destructive" className="mt-4 animate-in slide-in-from-top-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Validation Error</AlertTitle>
                            <AlertDescription>The total percentage assigned ({totalPercentage}%) exceeds the allowed 100%.</AlertDescription>
                        </Alert>
                    )}
                </div>
            </CardContent>
          </Card>

          {canEdit && (
            <div className="flex justify-end sticky bottom-6 z-10">
                <Button type="submit" disabled={isSubmitting || !form.formState.isDirty || isOverLimit} className="px-10 h-12 rounded-full shadow-xl shadow-primary/20">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Profit Distribution
                </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
}
