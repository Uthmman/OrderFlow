
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, PlusCircle, HelpCircle, Sparkles } from "lucide-react";
import { ProductSettingProvider, useProductSettings } from "@/hooks/use-product-settings";
import * as LucideIcons from 'lucide-react';
import Image from "next/image";
import { generateIcon } from "@/ai/flows/icon-flow";
import { useToast } from "@/hooks/use-toast";
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
  const { productSettings, loading, updateProductSettings, addCategory } = useProductSettings();
  const { toast } = useToast();
  const [generatingIcons, setGeneratingIcons] = React.useState<Record<number, boolean>>({});
  
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

  const handleGenerateIcon = async (index: number) => {
    const categoryName = form.getValues(`productCategories.${index}.name`);
    if (!categoryName) {
      toast({
        variant: "destructive",
        title: "Category Name Required",
        description: "Please enter a name for the category before generating an icon.",
      });
      return;
    }

    setGeneratingIcons(prev => ({...prev, [index]: true}));
    try {
      const result = await generateIcon({ categoryName });
      form.setValue(`productCategories.${index}.icon`, result.iconDataUri, { shouldDirty: true });
    } catch (error) {
      console.error("Icon generation failed", error);
      toast({
        variant: "destructive",
        title: "Icon Generation Failed",
        description: (error as Error).message || "An unexpected error occurred.",
      });
    } finally {
      setGeneratingIcons(prev => ({...prev, [index]: false}));
    }
  }

  const handleAddNewCategory = () => {
    // We call the hook's addCategory function which now handles AI generation
    addCategory({ name: "", icon: "Box" });
    // We need to reset the form to get the latest data from the provider
    form.reset({ productCategories: productSettings?.productCategories });
  };

  // Sync form with external state changes (like after AI generation)
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
              Manage product categories. Enter a Lucide icon name or generate one with AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => {
              const iconValue = form.watch(`productCategories.${index}.icon`);
              const isDataUri = iconValue.startsWith('data:image');
              const IconComponent = !isDataUri ? (LucideIcons as any)[iconValue] || HelpCircle : null;
              const isGenerating = generatingIcons[index];

              return (
                <div key={field.id} className="flex items-end gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <Label>Icon</Label>
                    <div className="h-10 w-10 bg-muted rounded-md mt-2 flex items-center justify-center">
                      {isDataUri ? (
                          <Image src={iconValue} alt="Generated Icon" width={40} height={40} className="object-contain" />
                      ) : IconComponent ? (
                          <IconComponent className="h-6 w-6 text-muted-foreground" />
                      ) : (
                          <HelpCircle className="h-6 w-6 text-muted-foreground" />
                      )}
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
                        <FormLabel>Icon Name or URI</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Sofa or data:..." disabled={isDataUri} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => handleGenerateIcon(index)} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
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
