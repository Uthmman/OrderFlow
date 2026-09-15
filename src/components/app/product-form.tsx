
"use client";

import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Loader2, 
    UploadCloud, 
    Trash2, 
    DollarSign, 
    ListChecks, 
    Ruler, 
    Boxes, 
    CheckCircle2, 
    ImageIcon,
    ArrowLeft,
    Save
} from "lucide-react";
import { useProductSettings } from "@/hooks/use-product-settings";
import { useColorSettings } from "@/hooks/use-color-settings";
import { useOrders } from "@/hooks/use-orders";
import { Product, OrderAttachment } from "@/lib/types";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { DynamicIcon } from "../ui/dynamic-icon";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/badge";

const productFormSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  billOfMaterials: z.string().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  materials: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  mainImageUrl: z.string().optional(),
  attachments: z.array(z.any()).default([]),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: Product;
  onSubmit: (data: Partial<Product>) => Promise<void>;
  isSubmitting: boolean;
  title: string;
}

export function ProductForm({ initialData, onSubmit, isSubmitting, title }: ProductFormProps) {
  const router = useRouter();
  const { productSettings } = useProductSettings();
  const { settings: colorSettings } = useColorSettings();
  const { uploadFile } = useOrders();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUploads, setLocalUploads] = useState<Record<string, boolean>>({});

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      productName: initialData?.productName || "",
      category: initialData?.category || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      billOfMaterials: initialData?.billOfMaterials || "",
      width: initialData?.dimensions?.width,
      height: initialData?.dimensions?.height,
      depth: initialData?.dimensions?.depth,
      materials: initialData?.material || [],
      colors: initialData?.colors || [],
      mainImageUrl: initialData?.mainImageUrl || "",
      attachments: initialData?.attachments || [],
    },
  });

  const { setValue, getValues, watch } = form;
  const watchedAttachments = watch("attachments");
  const watchedMaterials = watch("materials");
  const watchedColors = watch("colors");
  const watchedMainImage = watch("mainImageUrl");
  const isAnyUploading = Object.values(localUploads).some(v => v);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const currentAttachments = [...getValues("attachments")];
      
      for (const file of files) {
        const tempId = `${file.name}-${Date.now()}`;
        setLocalUploads(prev => ({ ...prev, [tempId]: true }));
        try {
          const attachment = await uploadFile(file);
          currentAttachments.push(attachment);
          setValue("attachments", currentAttachments, { shouldDirty: true });
          
          // Set as main image if none exists
          if (!getValues("mainImageUrl")) {
              setValue("mainImageUrl", attachment.url);
          }
        } catch (error) {
          console.error("Upload failed", error);
        } finally {
          setLocalUploads(prev => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }
      }
    }
  };

  const removeAttachment = (url: string) => {
    const current = getValues("attachments");
    const updated = current.filter((a: OrderAttachment) => a.url !== url);
    setValue("attachments", updated, { shouldDirty: true });
    if (getValues("mainImageUrl") === url) {
        setValue("mainImageUrl", updated[0]?.url || "");
    }
  };

  const toggleSelection = (field: "materials" | "colors", value: string) => {
    const current = getValues(field);
    const updated = current.includes(value)
      ? current.filter((v: string) => v !== value)
      : [...current, value];
    setValue(field, updated, { shouldDirty: true });
  };

  const onFormSubmit = async (values: ProductFormValues) => {
    const payload: Partial<Product> = {
      productName: values.productName,
      category: values.category,
      description: values.description,
      price: values.price,
      billOfMaterials: values.billOfMaterials,
      dimensions: values.width && values.height && values.depth ? {
          width: values.width,
          height: values.height,
          depth: values.depth
      } : undefined,
      material: values.materials,
      colors: values.colors,
      mainImageUrl: values.mainImageUrl,
      attachments: values.attachments,
    };
    await onSubmit(payload);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-8 pb-20">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button type="button" variant="outline" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold font-headline tracking-tight">{title}</h1>
            </div>
            <Button type="submit" disabled={isSubmitting || isAnyUploading} className="min-w-[140px]">
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Product
            </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Basic Info & Specs */}
            <div className="lg:col-span-2 space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Boxes className="h-5 w-5 text-primary" /> Basic Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="productName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl><Input placeholder="e.g. Luxury Velvet Sofa" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {productSettings?.productCategories.map(c => (
                                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Public Description</FormLabel>
                                    <FormControl><Textarea rows={3} placeholder="Customer facing description..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card className="border-primary/20 bg-primary/5">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-primary" /> Financials
                        </CardTitle>
                        <CardDescription>Base price used for initial order quotes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Base Unit Price</FormLabel>
                                    <FormControl>
                                        <div className="relative max-w-[200px]">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                            <Input type="number" className="pl-9 text-lg font-bold" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <ListChecks className="h-5 w-5 text-primary" /> Bill of Materials
                        </CardTitle>
                        <CardDescription>Internal technical list for manufacturing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            control={form.control}
                            name="billOfMaterials"
                            render={({ field }) => (
                                <FormItem>
                                    <FormControl>
                                        <Textarea 
                                            rows={10} 
                                            className="font-mono text-sm leading-relaxed" 
                                            placeholder="4x Heavy Duty Hinges&#10;2.5m Oak Edge Band&#10;8x 40mm Wood Screws..." 
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormDescription>List all hardware and materials needed to build this piece.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Ruler className="h-5 w-5 text-primary" /> Specifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-6">
                            <FormField
                                control={form.control}
                                name="width"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Width (cm)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="height"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Height (cm)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="depth"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Depth (cm)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                    </FormItem>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Right Column: Media, Materials, Colors */}
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                             <div className="flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" /> Visuals</div>
                             {isAnyUploading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div 
                            className={cn(
                                "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all bg-slate-50",
                                isAnyUploading ? "opacity-50" : "hover:border-primary/50"
                            )}
                            onClick={() => !isAnyUploading && fileInputRef.current?.click()}
                        >
                            <UploadCloud className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                            <p className="text-xs font-bold uppercase tracking-wider">Upload Images</p>
                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
                        </div>

                        {watchedAttachments.length > 0 && (
                            <div className="grid grid-cols-2 gap-3">
                                {watchedAttachments.map((att: OrderAttachment) => (
                                    <div key={att.url} className={cn(
                                        "group relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                        watchedMainImage === att.url ? "border-primary" : "border-transparent"
                                    )}>
                                        <Image src={att.url} alt="upload" fill className="object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                            <Button type="button" variant="secondary" size="sm" className="h-7 text-[10px] rounded-full" onClick={() => setValue("mainImageUrl", att.url)}>
                                                {watchedMainImage === att.url ? <CheckCircle2 className="h-3 w-3 mr-1" /> : "Set Main"}
                                            </Button>
                                            <Button type="button" variant="destructive" size="icon" className="h-7 w-7 rounded-full" onClick={() => removeAttachment(att.url)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {watchedAttachments.length === 0 && (
                            <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
                                <p className="text-xs text-muted-foreground italic">No images uploaded yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Options</CardTitle></CardHeader>
                    <CardContent className="space-y-8">
                        <div className="space-y-4">
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Standard Materials</FormLabel>
                            <div className="grid grid-cols-1 gap-2">
                                {productSettings?.materials.map(m => (
                                    <button 
                                        key={m.name} 
                                        type="button" 
                                        onClick={() => toggleSelection("materials", m.name)}
                                        className={cn(
                                            "flex items-center gap-3 p-3 border rounded-lg text-left transition-all",
                                            watchedMaterials.includes(m.name) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                                        )}
                                    >
                                        <DynamicIcon icon={m.icon} className="h-4 w-4" />
                                        <span className="text-sm font-medium">{m.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <FormLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Standard Colors</FormLabel>
                            <div className="grid grid-cols-4 gap-2">
                                {colorSettings?.woodFinishes.map(w => (
                                    <button 
                                        key={w.name} 
                                        type="button" 
                                        title={w.name}
                                        onClick={() => toggleSelection("colors", w.name)}
                                        className={cn(
                                            "aspect-square relative rounded-md overflow-hidden border-2 transition-all",
                                            watchedColors.includes(w.name) ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                        )}
                                    >
                                        <Image src={w.imageUrl} alt={w.name} fill className="object-cover" />
                                    </button>
                                ))}
                                {colorSettings?.customColors.map(c => (
                                    <button 
                                        key={c.name} 
                                        type="button" 
                                        title={c.name}
                                        onClick={() => toggleSelection("colors", c.name)}
                                        className={cn(
                                            "aspect-square rounded-md border-2 transition-all",
                                            watchedColors.includes(c.name) ? "border-primary ring-2 ring-primary/20" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c.colorValue }}
                                    />
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
      </form>
    </Form>
  );
}
