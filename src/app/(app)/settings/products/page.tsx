
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, PlusCircle, HelpCircle } from "lucide-react";
import { ProductSettingProvider, useProductSettings } from "@/hooks/use-product-settings";
import * as LucideIcons from 'lucide-react';
import React from "react";


const productCategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  icon: z.string().min(1, "Icon name is required."),
});

const productSettingsFormSchema = z.object({
  productCategories: z.array(productCategorySchema),
});

type ProductSettingsFormValues = z.infer<typeof productSettingsFormSchema>;

function ProductSettingsForm() {
  const { productSettings, loading, updateProductSettings } = useProductSettings();
  
  const form = useForm<ProductSettingsFormValues>({
    resolver: zodResolver(productSettingsFormSchema),
    values: {
      productCategories: productSettings?.productCategories || [],
    },
    resetOptions: {
      keepDirtyValues: false,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "productCategories",
  });

  const onSubmit = (data: ProductSettingsFormValues) => {
    updateProductSettings(data);
  };

  // Sync form with external state changes
  React.useEffect(() => {
    if (productSettings) {
      form.reset({ productCategories: productSettings.productCategories });
    }
  }, [productSettings, form]);
  
  if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Product Categories</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "", icon: "Box" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            <CardDescription>
              Manage product categories and their icons. Use any icon name from the Lucide library.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const iconName = form.watch(`productCategories.${index}.icon`);
              const IconComponent = (LucideIcons as any)[iconName] || HelpCircle;

              return (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <Label>Icon</Label>
                    <div className="h-10 w-10 bg-muted rounded-md mt-2 flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-muted-foreground" />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name={`productCategories.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormLabel>Category Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Sofa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`productCategories.${index}.icon`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Icon Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Sofa" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
            {fields.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No product categories added yet.</p>}
          </CardContent>
        </Card>
        
        <div className="flex justify-end sticky bottom-0 bg-background/95 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
            </Button>
        </div>
      </form>
    </Form>
  );
}


export default function ProductSettingsPage() {
    return (
        <ProductSettingProvider>
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold font-headline tracking-tight">Product Settings</h1>
                    <p className="text-muted-foreground">
                    Manage your product categories and their display icons.
                    </p>
                </div>
                <ProductSettingsForm />
            </div>
        </ProductSettingProvider>
    )
}
