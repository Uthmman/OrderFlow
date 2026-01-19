
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Trash2, Edit, Save, X } from "lucide-react";
import { useProductSettings } from "@/hooks/use-product-settings";
import React, { useState } from "react";
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
  const { productSettings, loading, addCategory, updateCategory, deleteCategory, addMaterial, updateMaterial, deleteMaterial } = useProductSettings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: "", icon: "Box" },
  });

  const materialForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: { name: "", icon: "Box" },
  });

  const editingCategoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema)
  });

  const editingMaterialForm = useForm<MaterialFormValues>({
    resolver: zodResolver(materialFormSchema)
  });

  const handleAddCategory = async (data: CategoryFormValues) => {
    setIsSubmitting(true);
    await addCategory(data);
    categoryForm.reset();
    setIsSubmitting(false);
  };

  const handleEditCategory = (index: number, category: ProductCategory) => {
    setEditingCategoryIndex(index);
    editingCategoryForm.reset(category);
  }

  const handleSaveCategory = async (index: number) => {
    const isValid = await editingCategoryForm.trigger();
    if (!isValid) return;
    const data = editingCategoryForm.getValues();
    await updateCategory(index, data);
    setEditingCategoryIndex(null);
  }

  const handleAddMaterial = async (data: MaterialFormValues) => {
    setIsSubmitting(true);
    await addMaterial(data);
    materialForm.reset();
    setIsSubmitting(false);
  };

  const handleEditMaterial = (index: number, material: Material) => {
    setEditingMaterialIndex(index);
    editingMaterialForm.reset(material);
  }

  const handleSaveMaterial = async (index: number) => {
    const isValid = await editingMaterialForm.trigger();
    if (!isValid) return;
    const data = editingMaterialForm.getValues();
    await updateMaterial(index, data);
    setEditingMaterialIndex(null);
  }

  const watchedCategoryIcon = categoryForm.watch('icon');
  const watchedMaterialIcon = materialForm.watch('icon');
  const watchedEditingCategoryIcon = editingCategoryForm.watch('icon');
  const watchedEditingMaterialIcon = editingMaterialForm.watch('icon');

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
                          <FormItem className="flex-grow w-full">
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
                          <FormItem className="flex-grow w-full">
                              <FormLabel>Icon Name</FormLabel>
                                <div className="flex items-center gap-2">
                                  <FormControl><Input {...field} placeholder="e.g. Sofa or mdi:desk" /></FormControl>
                                  <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                      <DynamicIcon icon={watchedCategoryIcon} className="h-5 w-5 text-muted-foreground" />
                                  </div>
                              </div>
                              <FormMessage />
                          </FormItem>
                      )}
                  />
                  <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto shrink-0">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Category
                  </Button>
              </form>
            </Form>

            <Separator />

            <div className="space-y-2">
                <Label>Existing Categories</Label>
                {productSettings?.productCategories.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No categories added yet.</p>}
                {productSettings?.productCategories.map((cat, index) => (
                    <div key={index}>
                    { editingCategoryIndex === index ? (
                        <Form {...editingCategoryForm}>
                            <form onSubmit={(e) => e.preventDefault()} className="flex items-end gap-2 p-2 border rounded-lg bg-muted/50">
                                <FormField
                                    control={editingCategoryForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <FormControl><Input {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editingCategoryForm.control}
                                    name="icon"
                                    render={({ field }) => (
                                        <FormItem className="flex-grow">
                                            <div className="flex items-center gap-2">
                                                <FormControl><Input {...field} /></FormControl>
                                                <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                                    <DynamicIcon icon={watchedEditingCategoryIcon} className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="button" size="icon" onClick={() => handleSaveCategory(index)}><Save className="h-4 w-4" /></Button>
                                <Button type="button" variant="outline" size="icon" onClick={() => setEditingCategoryIndex(null)}><X className="h-4 w-4" /></Button>
                            </form>
                        </Form>
                    ) : (
                        <div className="flex items-center gap-4 p-2 border rounded-lg">
                            <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                               <DynamicIcon icon={cat.icon} className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <span className="font-medium flex-grow">{cat.name}</span>
                            <span className="text-sm text-muted-foreground">{cat.icon}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleEditCategory(index, cat)}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" onClick={() => deleteCategory(index)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    )}
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
                            <FormItem className="flex-grow w-full">
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
                            <FormItem className="flex-grow w-full">
                                <FormLabel>Icon Name</FormLabel>
                                 <div className="flex items-center gap-2">
                                    <FormControl><Input {...field} placeholder="e.g. PaintBucket" /></FormControl>
                                    <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                        <DynamicIcon icon={watchedMaterialIcon} className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto shrink-0">
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Add Material
                    </Button>
                </form>
              </Form>

              <Separator />

              <div className="space-y-2">
                  <Label>Existing Materials</Label>
                  {productSettings?.materials.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No materials added yet.</p>}
                  {productSettings?.materials.map((mat, index) => (
                      <div key={index}>
                        {editingMaterialIndex === index ? (
                            <Form {...editingMaterialForm}>
                                <form onSubmit={(e) => e.preventDefault()} className="flex items-end gap-2 p-2 border rounded-lg bg-muted/50">
                                    <FormField
                                        control={editingMaterialForm.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={editingMaterialForm.control}
                                        name="icon"
                                        render={({ field }) => (
                                            <FormItem className="flex-grow">
                                                <div className="flex items-center gap-2">
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                                        <DynamicIcon icon={watchedEditingMaterialIcon} className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" size="icon" onClick={() => handleSaveMaterial(index)}><Save className="h-4 w-4" /></Button>
                                    <Button type="button" variant="outline" size="icon" onClick={() => setEditingMaterialIndex(null)}><X className="h-4 w-4" /></Button>
                                </form>
                            </Form>
                        ) : (
                          <div className="flex items-center gap-4 p-2 border rounded-lg">
                              <div className="h-8 w-8 bg-muted rounded-md flex items-center justify-center overflow-hidden">
                                  <DynamicIcon icon={mat.icon} className="h-5 w-5 text-muted-foreground" />
                              </div>
                              <span className="font-medium flex-grow">{mat.name}</span>
                              <span className="text-sm text-muted-foreground">{mat.icon}</span>
                              <Button type="button" variant="ghost" size="icon" onClick={() => handleEditMaterial(index, mat)}>
                                  <Edit className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon" onClick={() => deleteMaterial(index)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                          </div>
                        )}
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

    