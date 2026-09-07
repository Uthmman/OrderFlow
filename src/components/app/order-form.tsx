
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DollarSign, UserPlus, Loader2, UploadCloud, File as FileIcon, Trash2, ArrowLeft, ArrowRight, PlusCircle as PlusCircleIcon, Receipt, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderStatus, Product } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback, useTransition, useMemo } from "react"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/hooks/use-toast"
import { CustomerForm } from "./customer-form"
import { Timestamp } from "firebase/firestore"
import { useColorSettings } from "@/hooks/use-color-settings"
import { useOrders } from "@/hooks/use-orders"
import { Progress } from "@/components/ui/progress"
import { useProductSettings } from "@/hooks/use-product-settings"
import { usePaymentSettings } from "@/hooks/use-payment-settings"
import * as LucideIcons from 'lucide-react'
import { v4 as uuidv4 } from "uuid"
import { useProducts } from "@/hooks/use-products"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { DynamicIcon } from "../ui/dynamic-icon"

const productSchema = z.object({
  id: z.string(),
  productName: z.string().min(3, "Product name required.").optional().or(z.literal('')),
  category: z.string().min(1, "Category is required."),
  description: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  designAttachments: z.array(z.any()).optional(),
  colors: z.array(z.string()).optional(),
  material: z.array(z.string()).optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  colorAsAttachment: z.boolean().default(false),
  price: z.coerce.number().min(0).default(0),
})

const formSchema = z.object({
  customerId: z.string().min(1, "Customer required.").optional(),
  location: z.object({ town: z.string().min(2, "Location required.") }).optional(),
  products: z.array(productSchema).min(1, "At least one product required."),
  status: z.enum(["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"]).optional(),
  incomeAmount: z.coerce.number().min(0).optional(),
  prepaidAmount: z.coerce.number().optional(),
  paymentDetails: z.string().optional(),
  creationDate: z.date().optional(),
  deadline: z.date().optional(),
  isUrgent: z.boolean().default(false),
  
  withReceipt: z.boolean().default(false),
  vatAmount: z.coerce.number().default(0),
  totalWithVat: z.coerce.number().default(0),
  paymentMethod: z.string().optional(),
  bankId: z.string().optional(),
  receiptFile: z.any().optional(),
})

type OrderFormValues = z.infer<typeof formSchema>

interface OrderFormProps {
  order?: Order;
  onSave?: (data: Omit<Order, 'id' | 'creationDate'>, isNew: boolean) => Promise<string | undefined>;
  submitButtonText?: string;
  isSubmitting?: boolean;
  isProductCreationMode?: boolean;
}

const VAT_RATE = 0.15;

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (/^\d{4}-\d{2}-\d{2}$/.test(timestamp)) return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
        return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
}

const STEPS = [
  { id: 1, title: 'Customer & Location', fields: ['customerId', 'location'] },
  { id: 2, title: 'Product Setup', fields: [] },
  { id: 3, title: 'Category', fields: ['category'] },
  { id: 4, title: 'Source', fields: [] },
  { id: 5, title: 'Details', fields: ['productName'] },
  { id: 6, title: 'Material', fields: ['material'] },
  { id: 7, title: 'Color', fields: ['colors'] },
  { id: 8, title: 'Review', fields: [] },
  { id: 9, title: 'Pricing & Receipt', fields: ['incomeAmount'] },
  { id: 10, title: 'Finalize', fields: ['status', 'deadline'] }
];

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false, isProductCreationMode = false }: OrderFormProps) {
  const router = useRouter();
  const { customers, addCustomer } = useCustomers();
  const { products: catalogProducts } = useProducts();
  const { settings: colorSettings } = useColorSettings();
  const { productSettings } = useProductSettings();
  const { settings: paymentSettings } = usePaymentSettings();
  const { addAttachment, uploadProgress, removeAttachment } = useOrders();
  
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(isProductCreationMode ? 3 : 1);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultProduct: Product = { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0 };
    const defaultValues = { 
        products: [defaultProduct], 
        isUrgent: false, 
        status: "Pending" as OrderStatus, 
        incomeAmount: 0, 
        customerId: '', 
        creationDate: new Date(), 
        deadline: new Date(), 
        location: { town: '' },
        withReceipt: false,
        vatAmount: 0,
        totalWithVat: 0,
        paymentMethod: 'Cash'
    };
    if (!orderToMap) return defaultValues as OrderFormValues;
    const products = orderToMap.products?.map(p => ({ 
        ...p, 
        colorAsAttachment: p.colors?.includes("As Attached Picture"), 
        width: p.dimensions?.width, 
        height: p.dimensions?.height, 
        depth: p.dimensions?.depth 
    })) || [defaultProduct];
    return { 
        ...defaultValues, 
        ...orderToMap, 
        creationDate: toDate(orderToMap.creationDate) || new Date(), 
        deadline: toDate(orderToMap.deadline) || new Date(), 
        location: orderToMap.location || { town: '' }, 
        products 
    } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({ resolver: zodResolver(formSchema), defaultValues: mapOrderToFormValues(initialOrder) });
  const { setValue, getValues, watch, trigger } = form;
  const watchedProducts = watch("products");
  const watchedWithReceipt = watch("withReceipt");
  const watchedIncome = watch("incomeAmount");

  useEffect(() => {
    if (watchedWithReceipt) {
        const vat = (watchedIncome || 0) * VAT_RATE;
        setValue("vatAmount", Math.round(vat), { shouldDirty: true });
        setValue("totalWithVat", Math.round((watchedIncome || 0) + vat), { shouldDirty: true });
    } else {
        setValue("vatAmount", 0);
        setValue("totalWithVat", watchedIncome || 0);
    }
  }, [watchedWithReceipt, watchedIncome, setValue]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      for (const file of files) {
          if (initialOrder) {
              const att = await addAttachment(initialOrder.id, currentProductIndex, file);
              if (att) {
                  const updated = [...getValues('products')];
                  updated[currentProductIndex].attachments = [...(updated[currentProductIndex].attachments || []), att];
                  setValue('products', updated, { shouldDirty: true });
              }
          }
      }
    }
  };

  const handleCreateAndSelectCustomer = async (data: any) => {
    setNewCustomerSubmitting(true);
    try {
        const id = await addCustomer(data);
        setValue("customerId", id, { shouldDirty: true });
        setIsCreatingNewCustomer(false);
    } finally {
        setNewCustomerSubmitting(false);
    }
  };

  const nextStep = async () => {
    let fieldsToValidate: any = [];
    if(currentStep === 1) fieldsToValidate = ['customerId', 'location.town'];
    
    const isValid = fieldsToValidate.length > 0 ? await trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (!initialOrder && currentStep === 1 && onSave) {
        setIsManualSaving(true);
        const vals = getValues();
        const id = await onSave({ ...vals, customerName: customers.find(c => c.id === vals.customerId)?.name || "Unknown", status: 'Pending' } as any, true);
        if (id) { 
            router.replace(`/orders/${id}/edit?step=3`); 
            setIsManualSaving(false); 
            return; 
        }
        setIsManualSaving(false);
    }
    let next = currentStep + 1;
    if (currentStep === 3) next = 4;
    setCurrentStep(Math.min(next, STEPS.length));
  };

  const prevStep = () => {
     let prev = currentStep - 1;
     if (initialOrder && [5, 6, 7].includes(currentStep)) prev = 4;
     else if (currentStep === 8) prev = isProductCreationMode ? 7 : 4;
     else if (currentStep === 4) prev = 3;
     else if (currentStep === 3 && !isProductCreationMode) prev = 1;
     setCurrentStep(Math.max(prev, 1));
  };

  const handleExistingProductSelect = (product: Product) => {
    const updated = [...getValues('products')];
    updated[currentProductIndex] = { ...product, price: Number(product.price) || 0, id: uuidv4() };
    setValue('products', updated, { shouldDirty: true });
    setCurrentStep(8);
  };
  
  const handleRemoveProduct = (index: number) => {
    const current = getValues('products');
    if (current.length <= 1) return;
    const updated = current.filter((_, i) => i !== index);
    setValue('products', updated, { shouldDirty: true });
    if (currentProductIndex >= updated.length) setCurrentProductIndex(Math.max(0, updated.length - 1));
  };

  const handleFormSubmit = async (values: OrderFormValues) => {
    if (!onSave) return;
    setIsManualSaving(true);
    startTransition(async () => {
        const updated = values.products.map(p => ({ 
            ...p, 
            colors: (p as any).colorAsAttachment ? ["As Attached Picture"] : p.colors, 
            dimensions: p.width && p.height && p.depth ? { width: Number(p.width), height: Number(p.height), depth: Number(p.depth) } : undefined 
        }));
        
        const selectedBank = paymentSettings?.banks.find(b => b.id === values.bankId);

        const payload: any = { 
            ...values, 
            products: updated, 
            status: isProductCreationMode ? undefined : (values.status === 'Pending' ? 'In Progress' : values.status), 
            customerName: customers.find(c => c.id === values.customerId)?.name || "Unknown",
            bankName: selectedBank?.bankName,
            bankAccountNumber: selectedBank?.accountNumber
        };
        
        if (values.receiptFile) payload.file = values.receiptFile;

        try { await onSave(payload as any, !initialOrder); } finally { setIsManualSaving(false); }
    });
  };

  const isSubmitting = isExternallySubmitting || isManualSaving;
  const productCategories = productSettings?.productCategories || [];
  const totalIncome = useMemo(() => watchedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0), [watchedProducts]);

  useEffect(() => { 
    if (form.getValues('incomeAmount') !== totalIncome) setValue('incomeAmount', totalIncome, { shouldDirty: true }); 
  }, [totalIncome, setValue, form]);

  return (
    <>
      <div className="mb-8 space-y-4">
        <Progress value={(currentStep / STEPS.length) * 100} className="w-full" />
        <div className="flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <span>Step {currentStep} of {STEPS.length}</span>
            <span>{STEPS.find(s => s.id === currentStep)?.title}</span>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && !isProductCreationMode && (
              <Card>
                <CardHeader><CardTitle>Customer & Location</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    {isCreatingNewCustomer ? (
                        <CustomerForm 
                          onSubmit={handleCreateAndSelectCustomer} 
                          isSubmitting={newCustomerSubmitting} 
                          submitButtonText="Create & Select" 
                          onCancel={() => setIsCreatingNewCustomer(false)} 
                        />
                    ) : (
                        <div className="space-y-6">
                            <FormField control={form.control} name="customerId" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Customer</FormLabel>
                                  <div className="flex items-center gap-2">
                                    <Select 
                                      onValueChange={v => { field.onChange(v); const c = customers.find(cu => cu.id === v); if(c?.location.town) setValue('location.town', c.location.town); }} 
                                      value={field.value}
                                    >
                                      <FormControl><SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger></FormControl>
                                      <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingNewCustomer(true)}><UserPlus className="h-4 w-4" /></Button>
                                  </div>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="location.town" render={({ field }) => (
                                <FormItem><FormLabel>Order Location</FormLabel><FormControl><Input placeholder="Town/City" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    )}
                </CardContent>
              </Card>
          )}

          {initialOrder && currentStep === 2 && (
              <Card>
                <CardHeader><CardTitle>Product Setup</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                          const cat = productSettings?.productCategories.find(c => c.name === p.category);
                          return (
                              <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                                  <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                    <DynamicIcon icon={cat?.icon || 'Box'} className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-grow">
                                    <p className="font-semibold">{p.productName || `Product ${i + 1}`}</p>
                                    <p className="text-xs text-muted-foreground">{p.category}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Button variant="outline" size="sm" onClick={() => { setCurrentProductIndex(i); setCurrentStep(5); }}>Edit</Button>
                                      {watchedProducts.length > 1 && <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(i)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>}
                                  </div>
                              </div>
                          )
                      })}
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => { 
                          const current = getValues('products'); 
                          setValue('products', [...current, { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0 }], { shouldDirty: true }); 
                          setCurrentProductIndex(current.length); 
                          setCurrentStep(3); 
                        }} 
                        className="w-full sm:w-auto"
                      >
                        <PlusCircleIcon className="mr-2 h-4 w-4" /> Add Another
                      </Button>
                </CardContent>
              </Card>
          )}

          {currentStep === 3 && (
              <Card>
                <CardHeader><CardTitle>Category</CardTitle></CardHeader>
                <CardContent>
                  <FormField control={form.control} name={`products.${currentProductIndex}.category`} render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {productCategories.map(c => { 
                              const Icon = (LucideIcons as any)[c.icon] || LucideIcons.Box; 
                              return (
                                <button 
                                  key={c.name} 
                                  type="button" 
                                  onClick={() => field.onChange(c.name)} 
                                  className={cn("p-4 border rounded-lg flex flex-col items-center gap-2 hover:bg-accent transition-all", field.value === c.name && "bg-primary text-primary-foreground shadow-lg scale-105")}
                                >
                                  <Icon className="h-8 w-8" />
                                  <span className="text-xs font-bold uppercase">{c.name}</span>
                                </button>
                              )
                            })}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                  )} />
                </CardContent>
              </Card>
          )}

          {currentStep === 4 && (
              <Card>
                <CardHeader><CardTitle>Source</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button type="button" onClick={() => setCurrentStep(5)} className="p-6 border rounded-lg flex flex-col items-center gap-2 hover:bg-accent">
                      <PlusCircleIcon className="h-10 w-10" />
                      <h3>Create New Design</h3>
                    </button>
                    <div className="p-6 border rounded-lg bg-muted/20">
                      <Input placeholder="Search catalog..." value={catalogSearchTerm} onChange={e => setCatalogSearchTerm(e.target.value)} />
                      <ScrollArea className="h-64 mt-4">
                        {catalogProducts.filter(p => p.category === getValues(`products.${currentProductIndex}.category`) && (p.productName?.toLowerCase().includes(catalogSearchTerm.toLowerCase()))).map(p => (
                          <div key={p.id} onClick={() => handleExistingProductSelect(p)} className="p-3 border rounded-md mb-2 cursor-pointer hover:bg-background">
                            {p.productName}
                          </div>
                        ))}
                      </ScrollArea>
                    </div>
                  </div>
                </CardContent>
              </Card>
          )}

          {currentStep === 5 && (
              <Card>
                <CardHeader><CardTitle>Details & Files</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name={`products.${currentProductIndex}.productName`} render={({ field }) => <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                    <FormField control={form.control} name={`products.${currentProductIndex}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl></FormItem>} />
                    <div className="grid grid-cols-3 gap-4">
                      {['width', 'height', 'depth'].map(f => (
                        <FormField key={f} control={form.control} name={`products.${currentProductIndex}.${f}` as any} render={({ field }) => (
                          <FormItem><FormLabel className="capitalize">{f}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        ))}
                      )}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors" onClick={() => fileInputRef.current?.click()}>
                            <UploadCloud className="h-10 w-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Click to upload files or photos</p>
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
                        </div>
                        <div className="space-y-2">{watchedProducts[currentProductIndex].attachments?.map((att: any) => (
                            <div key={att.url} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                                <div className="flex items-center gap-2 truncate">
                                    {att.fileName?.match(/\.(jpeg|jpg|png|webp)$/i) ? <Image src={att.url} alt="img" width={24} height={24} className="h-6 w-6 rounded object-cover" /> : <FileIcon className="h-4 w-4 opacity-50" />}
                                    <span className="text-xs truncate">{att.fileName}</span>
                                </div>
                                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeAttachment(initialOrder?.id || '', currentProductIndex, att)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        ))}</div>
                    </div>
                </CardContent>
              </Card>
          )}

          {currentStep === 6 && (
              <Card>
                <CardHeader><CardTitle>Material</CardTitle></CardHeader>
                <CardContent>
                  <FormField control={form.control} name={`products.${currentProductIndex}.material`} render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {productSettings?.materials.map(m => { 
                            const Icon = (LucideIcons as any)[m.icon] || LucideIcons.Box; 
                            return (
                              <button 
                                key={m.name} 
                                type="button" 
                                onClick={() => field.onChange(field.value?.includes(m.name) ? field.value?.filter(n => n !== m.name) : [...(field.value || []), m.name])} 
                                className={cn("p-4 border rounded-lg flex flex-col items-center gap-2 hover:border-primary transition-all", field.value?.includes(m.name) && "bg-primary text-primary-foreground shadow-lg scale-105")}
                              >
                                <Icon className="h-8 w-8" />
                                {m.name}
                              </button>
                            )
                          })}
                        </div>
                      </FormItem>
                  )} />
                </CardContent>
              </Card>
          )}

          {currentStep === 7 && (
              <Card>
                <CardHeader><CardTitle>Color</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className={cn("space-y-6", watchedProducts[currentProductIndex].colorAsAttachment && "opacity-20 pointer-events-none")}>
                        <div className="grid grid-cols-4 gap-4">
                        {colorSettings?.customColors.map(o => (
                            <button key={o.name} type="button" onClick={() => {
                                const cur = getValues(`products.${currentProductIndex}.colors`) || [];
                                setValue(`products.${currentProductIndex}.colors`, cur.includes(o.name) ? cur.filter(v => v !== o.name) : [...cur, o.name], { shouldDirty: true });
                            }} className="flex flex-col items-center gap-2 cursor-pointer group">
                                <div style={{ backgroundColor: o.colorValue }} className={cn("rounded-full h-12 w-12 border shadow-sm group-hover:scale-110 transition-transform", (watchedProducts[currentProductIndex].colors || []).includes(o.name) && "ring-2 ring-primary ring-offset-2")} />
                                <span className="text-[10px] uppercase font-bold text-center">{o.name}</span>
                            </button>
                        ))}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {colorSettings?.woodFinishes.map(o => (
                            <button key={o.name} type="button" onClick={() => {
                                const cur = getValues(`products.${currentProductIndex}.colors`) || [];
                                setValue(`products.${currentProductIndex}.colors`, cur.includes(o.name) ? cur.filter(v => v !== o.name) : [...cur, o.name], { shouldDirty: true });
                            }} className="flex flex-col items-center gap-2 cursor-pointer group">
                                <Image src={o.imageUrl} alt={o.name} width={80} height={80} className={cn("rounded-lg h-20 w-full object-cover shadow-sm group-hover:scale-105 transition-transform", (watchedProducts[currentProductIndex].colors || []).includes(o.name) && "ring-2 ring-primary ring-offset-2")} />
                                <span className="text-[10px] uppercase font-bold">{o.name}</span>
                            </button>
                        ))}
                        </div>
                    </div>
                    <FormField control={form.control} name={`products.${currentProductIndex}.colorAsAttachment`} render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 mt-8 border p-4 rounded-lg bg-muted/20">
                        <FormControl><Checkbox checked={field.value} onCheckedChange={v => { field.onChange(v); if(v) setValue(`products.${currentProductIndex}.colors`, []); }} /></FormControl>
                        <FormLabel className="text-sm font-bold">COLOR AS ATTACHED PICTURE</FormLabel>
                        </FormItem>
                    )} />
                </CardContent>
              </Card>
          )}

          {currentStep === 8 && (
              <Card>
                <CardHeader><CardTitle>Review Designs</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                          <span className="font-bold">{p.productName || `Product ${i+1}`}</span>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => { setCurrentProductIndex(i); setCurrentStep(5); }}>Edit</Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleRemoveProduct(i)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      ))}
                      {!isProductCreationMode && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => { 
                            const cur = getValues('products'); 
                            setValue('products', [...cur, { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0 }], { shouldDirty: true }); 
                            setCurrentProductIndex(cur.length); 
                            setCurrentStep(3); 
                          }} 
                          className="w-full"
                        >
                          Add Another Product
                        </Button>
                      )}
                </CardContent>
              </Card>
          )}

          {currentStep === 9 && !isProductCreationMode && (
              <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Receipt</CardTitle>
                        <CardDescription>Manage totals, VAT, and official billing.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <FormField control={form.control} name="incomeAmount" render={({ field }) => <FormItem><FormLabel>Base Price (Before VAT)</FormLabel><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" /><Input type="number" className="pl-8 text-xl font-bold" {...field} readOnly /></div></FormItem>} />
                                <FormField control={form.control} name="withReceipt" render={({ field }) => (
                                    <FormItem className="flex items-center justify-between border p-4 rounded-lg bg-primary/5">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-base">Official Receipt</FormLabel>
                                            <FormDescription>Calculates VAT and enables receipt uploads.</FormDescription>
                                        </div>
                                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                                    </FormItem>
                                )} />
                                {watchedWithReceipt && (
                                    <div className="space-y-4 p-4 border rounded-lg bg-accent/10 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex justify-between text-sm"><span>VAT (15%)</span><span className="font-bold">+{form.getValues('vatAmount')}</span></div>
                                        <Separator />
                                        <div className="flex justify-between text-lg font-bold"><span>Total with VAT</span><span>{form.getValues('totalWithVat')}</span></div>
                                        
                                        <div className="space-y-2">
                                            <Label>Receipt Attachment</Label>
                                            <div className="flex items-center gap-2">
                                                <Button type="button" variant="outline" size="sm" onClick={() => receiptInputRef.current?.click()}>
                                                    <Receipt className="mr-2 h-4 w-4" /> {form.watch('receiptFile') ? 'Change Receipt' : 'Attach Receipt'}
                                                </Button>
                                                {form.watch('receiptFile') && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                                                <input ref={receiptInputRef} type="file" onChange={(e) => setValue('receiptFile', e.target.files?.[0])} className="hidden" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-4">
                                <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger></FormControl>
                                            <SelectContent>{(paymentSettings?.methods || []).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                {watch('paymentMethod') === 'Bank Transfer' && (
                                    <FormField control={form.control} name="bankId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Deposit Bank</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger></FormControl>
                                                <SelectContent>{(paymentSettings?.banks || []).map(b => (
                                                    <SelectItem key={b.id} value={b.id}>{b.bankName} ({b.accountNumber})</SelectItem>
                                                ))}</SelectContent>
                                            </Select>
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="prepaidAmount" render={({ field }) => <FormItem><FormLabel>Pre-paid Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                                <FormField control={form.control} name="paymentDetails" render={({ field }) => <FormItem><FormLabel>Payment Notes</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle className="text-sm font-bold uppercase text-muted-foreground">Individual Product Prices</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {watchedProducts.map((p, i) => (
                            <div key={p.id}>
                                <Label className="text-[10px] uppercase font-bold">{p.productName || `P${i+1}`}</Label>
                                <Input type="number" value={p.price || 0} onChange={e => {
                                    const updated = [...watchedProducts];
                                    updated[i].price = Number(e.target.value);
                                    setValue('products', updated, { shouldDirty: true });
                                }} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
              </div>
          )}

          {currentStep === 10 && !isProductCreationMode && (
              <Card>
                <CardHeader><CardTitle>Finalize Order</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                      <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{["Pending", "In Progress", "Designing", "Manufacturing", "Painting", "Completed"].map(s => <SelectItem key={s} value={s}>{s === 'Pending' ? 'Draft' : s}</SelectItem>)}</SelectContent></Select></FormItem>} />
                      <FormField control={form.control} name="deadline" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Delivery Deadline</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline" className="h-11 justify-start font-bold">{field.value ? format(field.value, "PPP") : "Select date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>} />
                      <FormField control={form.control} name="isUrgent" render={({ field }) => <FormItem className="flex items-center justify-between border p-4 rounded-lg bg-red-50/50 border-red-100"><div className="space-y-0.5"><FormLabel className="text-red-700 font-bold">URGENT ORDER</FormLabel><p className="text-xs text-red-600/70 italic">Prioritizes this in all lists</p></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                </CardContent>
              </Card>
          )}

          <div className="flex justify-between items-center gap-2 sticky bottom-0 bg-background/95 backdrop-blur-sm py-4 z-10 border-t mt-8">
              <Button variant="outline" type="button" onClick={() => form.formState.isDirty ? setShowCancelDialog(true) : router.back()} disabled={isPending || isSubmitting}>Cancel</Button>
              <div className="flex items-center gap-2">
                  {currentStep > 1 && <Button variant="outline" type="button" onClick={prevStep} disabled={isPending || isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>}
                  {currentStep < (isProductCreationMode ? 8 : 10) && ![2, 4, 8].includes(currentStep) && <Button type="button" onClick={nextStep} disabled={isPending || isSubmitting}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                  {((initialOrder && currentStep === 2) || (currentStep === 8 && !isProductCreationMode)) && <Button type="button" onClick={() => setCurrentStep(9)} disabled={isPending || isSubmitting}>Continue to Pricing <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                  {currentStep === (isProductCreationMode ? 8 : 10) && <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isSubmitting || Object.keys(uploadProgress).length > 0 || isPending}>{(isSubmitting || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isProductCreationMode ? 'Create Product' : (initialOrder ? submitButtonText : 'Finish Order')}</Button>}
              </div>
          </div>
        </form>
      </Form>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Unsaved Changes</AlertDialogTitle><AlertDialogDescription>You have unsaved changes. Are you sure you want to discard them?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Stay</AlertDialogCancel><AlertDialogAction onClick={() => router.back()}>Discard</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
