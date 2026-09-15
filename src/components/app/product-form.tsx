
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
    Save,
    Plus,
    Minus,
    Search,
    History,
    Package
} from "lucide-react";
import { useProductSettings } from "@/hooks/use-product-settings";
import { useColorSettings } from "@/hooks/use-color-settings";
import { useOrders } from "@/hooks/use-orders";
import { useSecondaryItems } from "@/hooks/use-secondary-items";
import { Product, OrderAttachment, BOMItem, PriceEntry } from "@/lib/types";
import Image from "next/image";
import { cn, formatCurrency, formatTimestamp } from "@/lib/utils";
import { DynamicIcon } from "../ui/dynamic-icon";
import { useRouter } from "next/navigation";
import { Badge } from "../ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const bomItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.string(),
});

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
  bomItems: z.array(bomItemSchema).default([]),
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
  const { items: secondaryItems, loading: secondaryLoading } = useSecondaryItems();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localUploads, setLocalUploads] = useState<Record<string, boolean>>({});
  const [itemSearch, setItemSearch] = useState("");
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  const [showPriceHistory, setShowPriceHistory] = useState(false);

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
      bomItems: initialData?.bomItems || [],
    },
  });

  const { setValue, getValues, watch, control } = form;
  const { fields: bomFields, append: appendBOM, remove: removeBOM } = useFieldArray({
    control,
    name: "bomItems",
  });

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
    let updatedPriceHistory = initialData?.priceHistory || [];
    
    // Check if price has changed to record history
    if (initialData && initialData.price !== values.price) {
        updatedPriceHistory = [
            { price: initialData.price, date: new Date().toISOString() },
            ...updatedPriceHistory
        ];
    }

    const payload: Partial<Product> = {
      productName: values.productName,
      category: values.category,
      description: values.description,
      price: values.price,
      priceHistory: updatedPriceHistory,
      billOfMaterials: values.billOfMaterials,
      dimensions: values.width && values.height && values.depth ? {
          width: Number(values.width),
          height: Number(values.height),
          depth: Number(values.depth)
      } : undefined,
      material: values.materials,
      colors: values.colors,
      mainImageUrl: values.mainImageUrl,
      attachments: values.attachments,
      bomItems: values.bomItems,
    };
    await onSubmit(payload);
  };

  const filteredItems = secondaryItems.filter(item => 
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const addItemToBOM = (item: any) => {
    appendBOM({
        itemId: item.id,
        name: item.name,
        quantity: 1,
        unit: item.unit
    });
    setIsItemPopoverOpen(false);
    setItemSearch("");
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
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-primary" /> Financials
                            </CardTitle>
                            <CardDescription>Base price used for initial order quotes.</CardDescription>
                        </div>
                        {initialData?.priceHistory && initialData.priceHistory.length > 0 && (
                            <Button variant="ghost" size="sm" type="button" onClick={() => setShowPriceHistory(!showPriceHistory)}>
                                <History className="h-4 w-4 mr-2" /> 
                                {showPriceHistory ? "Hide History" : "View History"}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="space-y-4">
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

                        {showPriceHistory && initialData?.priceHistory && (
                            <div className="mt-4 p-4 bg-background border rounded-lg animate-in fade-in slide-in-from-top-2">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Price History</p>
                                <div className="space-y-2">
                                    {initialData.priceHistory.map((entry, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs">
                                            <span className="text-muted-foreground">{formatTimestamp(entry.date)}</span>
                                            <span className="font-bold">{formatCurrency(entry.price)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <ListChecks className="h-5 w-5 text-primary" /> Bill of Materials
                            </CardTitle>
                            <CardDescription>Select items from central catalog and specify quantities.</CardDescription>
                        </div>
                        <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button size="sm" className="h-8">
                                    <Plus className="h-4 w-4 mr-2" /> Add Material
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" align="end">
                                <div className="p-2 border-b bg-muted/20">
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                        <Input 
                                            placeholder="Search items..." 
                                            className="h-8 pl-8 text-xs" 
                                            value={itemSearch}
                                            onChange={e => setItemSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <ScrollArea className="h-64">
                                    {secondaryLoading ? (
                                        <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-5 w-5" /></div>
                                    ) : filteredItems.length === 0 ? (
                                        <p className="p-4 text-center text-xs text-muted-foreground">No catalog items found.</p>
                                    ) : filteredItems.map(item => (
                                        <button 
                                            key={item.id} 
                                            type="button" 
                                            className="w-full text-left p-3 hover:bg-muted border-b last:border-0 flex items-center gap-3"
                                            onClick={() => addItemToBOM(item)}
                                        >
                                            <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                                                <Package className="h-4 w-4 opacity-60" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold truncate">{item.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{item.category} • {item.unit}</p>
                                            </div>
                                        </button>
                                    ))}
                                </ScrollArea>
                            </PopoverContent>
                        </Popover>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            {bomFields.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed rounded-lg bg-muted/10">
                                    <ListChecks className="h-10 w-10 mx-auto mb-3 opacity-10" />
                                    <p className="text-xs text-muted-foreground">No material items added yet.</p>
                                </div>
                            ) : bomFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30 group">
                                    <div className="flex-grow min-w-0">
                                        <p className="text-xs font-bold truncate">{field.name}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase">{field.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <FormField
                                            control={form.control}
                                            name={`bomItems.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="space-y-0">
                                                    <FormControl>
                                                        <Input 
                                                            type="number" 
                                                            step="0.01" 
                                                            className="h-8 w-20 text-xs text-right font-bold" 
                                                            {...field} 
                                                        />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            type="button" 
                                            className="h-8 w-8 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeBOM(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <FormField
                            control={form.control}
                            name="billOfMaterials"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Manual Technical Notes</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            rows={5} 
                                            className="font-mono text-sm leading-relaxed" 
                                            placeholder="Special assembly instructions or additional non-catalog items..." 
                                            {...field} 
                                            value={field.value ?? ""}
                                        />
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
