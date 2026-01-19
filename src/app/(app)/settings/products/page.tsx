
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2 } from "lucide-react";
import { useProductSettings } from "@/hooks/use-product-settings";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import type { ProductCategory, Material } from "@/lib/types";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  icon: z.string().min(1, "Icon name is required."),
});
type CategoryFormValues = z.infer<typeof categoryFormSchema>;

const materialFormSchema = z.object({
  name: z.string().min(1, "Material name is required."),
  icon: z.string().min(1, "Icon name is required."),
});
type MaterialFormValues = z.infer<typeof materialFormSchema>;

function ProductSettingsForm() {
  const { productSettings, loading, updateProductSettings } = useProductSettings();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", icon: "Box" },
  });

  const materialForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { name: "", icon: "Box" },
  });

  const handleAddCategory = async (data: CategoryFormValues) => {
    if (!productSettings) return;
    setIsSubmitting(true);
    const newCategory: ProductCategory = { name: data.name, icon: data.icon };
    const updatedCategories = [...productSettings.productCategories, newCategory];
    await updateProductSettings({ ...productSettings, productCategories: updatedCategories });
    categoryForm.reset();
    setIsSubmitting(false);
  };

  const handleAddMaterial = async (data: MaterialFormValues) => {
    if (!productSettings) return;
    setIsSubmitting(true);
    const newMaterial: Material = { name: data.name, icon: data.icon };
    const updatedMaterials = [...productSettings.materials, newMaterial];
    await updateProductSettings({ ...productSettings, materials: updatedMaterials });
    materialForm.reset();
    setIsSubmitting(false);
  };

  const handleDeleteCategory = async (categoryNameToDelete: string) => {
    if (!productSettings) return;
    const updatedCategories = productSettings.productCategories.filter(
      (cat) => cat.name !== categoryNameToDelete
    );
    await updateProductSettings({ ...productSettings, productCategories: updatedCategories });
  };
  
  const handleDeleteMaterial = async (materialNameToDelete: string) => {
      if (!productSettings) return;
      const updatedMaterials = productSettings.materials.filter(
          (mat) => mat.name !== materialNameToDelete
      );
      await updateProductSettings({ ...productSettings, materials: updatedMaterials });
  };


  if (loading) {
      return (
          <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
            <CardTitle>Product Categories</CardTitle>
            <CardDescription>
              Manage product categories and their icons. Use Lucide icon names (e.g., "Sofa") or Iconify names (e.g., "mdi:desk").
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Form {...categoryForm}>
              <form onSubmit={categoryForm.handleSubmit(handleAddCategory)} className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg bg-muted/50">
                  <FormField
                      control={categoryForm.control}
                      name="name"
                      render={({ field }) => (
                          <FormItem className="flex-grow">
                              <FormLabel>New Category Name</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. Sofa" /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <FormField
                      control={categoryForm.control}
                      name="icon"
                      render={({ field }) => (
                          <FormItem className="flex-grow">
                              <FormLabel>Icon Name</FormLabel>
                              <FormControl><Input {...field} placeholder="e.g. Sofa or mdi:desk" /></FormControl>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Category
                  </Button>
              </form>
            </Form>

            <Separator />

            <div className="space-y-2">
                <Label>Existing Categories</Label>
                {productSettings?.productCategories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No categories added yet.</p>}
                {productSettings?.productCategories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-4 p-2 border rounded-lg">
                        <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                           <DynamicIcon icon={cat.icon} className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <span className="font-medium flex-grow">{cat.name}</span>
                        <span className="text-sm text-muted-foreground">{cat.icon}</span>
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.name)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                ))}
            </div>
        </CardContent>
      </Card>
      
      <Card>
          <CardHeader>
              <CardTitle>Materials</CardTitle>
              <CardDescription>
                  Manage the material options available for orders and their icons.
              </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
               <Form {...materialForm}>
                <form onSubmit={materialForm.handleSubmit(handleAddMaterial)} className="flex flex-col sm:flex-row items-end gap-4 p-4 border rounded-lg bg-muted/50">
                    <FormField
                        control={materialForm.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel>New Material Name</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. MDF Paint" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={materialForm.control}
                        name="icon"
                        render={({ field }) => (
                            <FormItem className="flex-grow">
                                <FormLabel>Icon Name</FormLabel>
                                <FormControl><Input {...field} placeholder="e.g. PaintBucket" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Material
                    </Button>
                </form>
              </Form>

              <Separator />

              <div className="space-y-2">
                  <Label>Existing Materials</Label>
                  {productSettings?.materials.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No materials added yet.</p>}
                  {productSettings?.materials.map((mat) => (
                      <div key={mat.name} className="flex items-center gap-4 p-2 border rounded-lg">
                          <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                              <DynamicIcon icon={mat.icon} className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <span className="font-medium flex-grow">{mat.name}</span>
                          <span className="text-sm text-muted-foreground">{mat.icon}</span>
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleDeleteMaterial(mat.name)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>
    </div>
  );
}


export default function ProductSettingsPage() {
    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="text-3xl font-bold font-headline tracking-tight">Product Settings</h1>
                <p className="text-muted-foreground">
                Manage your product categories, materials, and their display icons.
                </p>
            </div>
            <ProductSettingsForm />
        </div>
    )
}
