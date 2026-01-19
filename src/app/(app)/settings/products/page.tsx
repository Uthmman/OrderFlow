
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
import React from "react";
import { Separator } from "@/components/ui/separator";
import { DynamicIcon } from "@/components/ui/dynamic-icon";

const productCategorySchema = z.object({
  name: z.string().min(1, "Name is required."),
  icon: z.string().min(1, "Icon name is required."),
});

const materialSchema = z.object({
  name: z.string().min(1, "Material name is required."),
  icon: z.string().min(1, "Icon name is required."),
});

const productSettingsFormSchema = z.object({
  productCategories: z.array(productCategorySchema),
  materials: z.array(materialSchema),
});

type ProductSettingsFormValues = z.infer<typeof productSettingsFormSchema>;

function ProductSettingsForm() {
  const { productSettings, loading, updateProductSettings } = useProductSettings();
  
  const form = useForm<ProductSettingsFormValues>({
    resolver: zodResolver(productSettingsFormSchema),
    values: {
      productCategories: productSettings?.productCategories || [],
      materials: productSettings?.materials || [],
    },
    resetOptions: {
      keepDirtyValues: false,
    }
  });

  const { fields: categoryFields, append: appendCategory, remove: removeCategory } = useFieldArray({
    control: form.control,
    name: "productCategories",
  });
  
  const { fields: materialFields, append: appendMaterial, remove: removeMaterial } = useFieldArray({
    control: form.control,
    name: "materials",
  });

  const onSubmit = (data: ProductSettingsFormValues) => {
    updateProductSettings(data);
  };

  // Sync form with external state changes
  React.useEffect(() => {
    if (productSettings) {
      form.reset({ 
        productCategories: productSettings.productCategories,
        materials: productSettings.materials,
      });
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Product Categories</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCategory({ name: "", icon: "Box" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            <CardDescription>
              Manage product categories and their icons. Use Lucide icon names (e.g., "Sofa") or Iconify names (e.g., "mdi:desk").
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryFields.map((field, index) => {
              const iconName = form.watch(`productCategories.${index}.icon`);

              return (
                <div key={field.id} className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 flex flex-col items-center self-center sm:self-end">
                    <Label>Icon</Label>
                    <div className="h-12 w-12 bg-muted rounded-md mt-2 flex items-center justify-center overflow-hidden">
                       <DynamicIcon icon={iconName} className="h-7 w-7 text-muted-foreground" />
                    </div>
                  </div>
                  <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <FormField
                        control={form.control}
                        name={`productCategories.${index}.name`}
                        render={({ field }) => (
                        <FormItem>
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
                            <Input {...field} placeholder="e.g. Sofa or mdi:desk" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCategory(index)} className="flex-shrink-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )
            })}
            {categoryFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No product categories added yet.</p>}
          </CardContent>
        </Card>
        
        <Separator />

        <Card>
            <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>Materials</CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => appendMaterial({ name: "", icon: "Box" })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Material
                    </Button>
                </div>
                <CardDescription>
                    Manage the material options available for orders and their icons.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {materialFields.map((field, index) => {
                    const iconName = form.watch(`materials.${index}.icon`);
                    return (
                        <div key={field.id} className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg">
                             <div className="flex-shrink-0 flex flex-col items-center self-center sm:self-end">
                                <Label>Icon</Label>
                                <div className="h-12 w-12 bg-muted rounded-md mt-2 flex items-center justify-center overflow-hidden">
                                <DynamicIcon icon={iconName} className="h-7 w-7 text-muted-foreground" />
                                </div>
                            </div>
                            <div className="w-full flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name={`materials.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Material Name</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. MDF Paint" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`materials.${index}.icon`}
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Icon Name</FormLabel>
                                        <FormControl>
                                        <Input {...field} placeholder="e.g. PaintBucket or mdi:paint" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(index)} className="flex-shrink-0">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    );
                 })}
                 {materialFields.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No materials added yet.</p>}
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
                    Manage your product categories, materials, and their display icons.
                    </p>
                </div>
                <ProductSettingsForm />
            </div>
        </ProductSettingProvider>
    )
}
