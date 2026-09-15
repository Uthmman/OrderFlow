
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
import { DollarSign, UserPlus, Loader2, UploadCloud, File as FileIcon, Trash2, ArrowLeft, ArrowRight, PlusCircle as PlusCircleIcon, Receipt, CheckCircle, Boxes, Palette, Ruler, CreditCard, Calendar as CalendarIcon, Phone, Search, PlusCircle, User, Plus, Minus, Image as ImageIcon } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderStatus, Product, OrderAttachment } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback } from "react"
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
  productName: z.string().min(1, "Product name required."),
  category: z.string().min(1, "Category is required."),
  description: z.string().optional(),
  attachments: z.array(z.any()).optional(),
  designAttachments: z.array(z.any()).optional(),
  colors: z.array(z.string()).optional(),
  material: z.array(z.string()).optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  quantity: z.coerce.number().min(1).default(1),
  colorAsAttachment: z.boolean().default(false),
  price: z.coerce.number().min(0).default(0),
})

const formSchema = z.object({
  customerId: z.string().optional(),
  location: z.object({ town: z.string().optional() }),
  products: z.array(productSchema).min(1, "At least one product required."),
  status: z.enum(["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"]),
  incomeAmount: z.coerce.number().min(0),
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

const STEPS = [
  { id: 1, title: 'Customer & Location', fields: ['customerId', 'location.town'] },
  { id: 2, title: 'Product Setup', fields: [] },
  { id: 3, title: 'Category', fields: [] },
  { id: 4, title: 'Source', fields: [] },
  { id: 5, title: 'Details', fields: [] },
  { id: 6, title: 'Material', fields: [] },
  { id: 7, title: 'Color', fields: [] },
  { id: 8, title: 'Review', fields: [] },
  { id: 9, title: 'Pricing & Receipt', fields: ['incomeAmount'] },
  { id: 10, title: 'Finalize', fields: ['deadline'] }
];

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp && typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000);
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
}

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false, isProductCreationMode = false }: OrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, addCustomer } = useCustomers();
  const { products: catalogProducts } = useProducts();
  const { settings: colorSettings } = useColorSettings();
  const { productSettings } = useProductSettings();
  const { settings: paymentSettings } = usePaymentSettings();
  const { uploadFile, uploadProgress } = useOrders();
  
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(searchParams.get('step') ? parseInt(searchParams.get('step')!) : (isProductCreationMode ? 3 : 1));
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState("");
  const [isCustomerPopoverOpen, setIsCustomerPopoverOpen] = useState(false);
  const [localUploads, setLocalUploads] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultProduct: Product = { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0, quantity: 1 };
    const defaultValues = { products: [defaultProduct], isUrgent: false, status: "Pending" as OrderStatus, incomeAmount: 0, customerId: '', creationDate: new Date(), deadline: new Date(), location: { town: '' }, withReceipt: false, vatAmount: 0, totalWithVat: 0, paymentMethod: 'Cash' };
    if (!orderToMap) return defaultValues as OrderFormValues;
    const products = orderToMap.products?.map(p => ({ ...p, colorAsAttachment: p.colors?.includes("As Attached Picture"), width: p.dimensions?.width, height: p.dimensions?.height, depth: p.dimensions?.depth, quantity: p.quantity || 1 })) || [defaultProduct];
    return { ...defaultValues, ...orderToMap, creationDate: toDate(orderToMap.creationDate) || new Date(), deadline: toDate(orderToMap.deadline) || new Date(), location: orderToMap.location || { town: '' }, products } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({ resolver: zodResolver(formSchema), defaultValues: mapOrderToFormValues(initialOrder) });
  const { setValue, getValues, watch, trigger, formState: { isDirty, errors } } = form;
  const watchedProducts = watch("products");
  const watchedWithReceipt = watch("withReceipt");
  const watchedIncome = watch("incomeAmount");
  const selectedCustomerId = watch("customerId");

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateCalculations = useCallback((base: number, withReceiptActive: boolean) => {
    if (withReceiptActive) {
      const vat = base * VAT_RATE;
      setValue("vatAmount", Math.round(vat));
      setValue("totalWithVat", Math.round(base + vat));
    } else {
      setValue("vatAmount", 0);
      setValue("totalWithVat", base);
    }
  }, [setValue]);

  const totalIncomeValue = watchedProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
  
  useEffect(() => { 
    if (currentStep < 9) {
      setValue('incomeAmount', totalIncomeValue);
      updateCalculations(totalIncomeValue, watchedWithReceipt);
    }
  }, [totalIncomeValue, currentStep, setValue, updateCalculations, watchedWithReceipt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const updatedProducts = [...getValues('products')];
      const p = updatedProducts[currentProductIndex];
      if (!p) return;

      for (const file of files) {
          const fileId = `${file.name}-${Date.now()}`;
          setLocalUploads(prev => ({ ...prev, [fileId]: true }));
          try {
              const att = await uploadFile(file);
              p.attachments = [...(p.attachments || []), att];
              setValue('products', updatedProducts, { shouldDirty: true });
          } catch (error) { 
              toast({ variant: "destructive", title: "Upload Failed", description: file.name });
          } finally {
              setLocalUploads(prev => { const n = { ...prev }; delete n[fileId]; return n; });
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
        setIsCustomerPopoverOpen(false);
    } finally { setNewCustomerSubmitting(false); }
  };

  const updateQuantity = (index: number, delta: number) => {
    const current = [...getValues('products')];
    if (current[index]) {
        current[index].quantity = Math.max(1, (current[index].quantity || 1) + delta);
        setValue('products', current, { shouldDirty: true });
    }
  };

  const nextStep = async () => {
    if (isExternallySubmitting || isManualSaving) return;
    let fields: any = [];
    if(currentStep === 1) fields = ['customerId', 'location.town'];
    if(currentStep === 5) fields = [`products.${currentProductIndex}.productName`];
    
    const isValid = fields.length > 0 ? await trigger(fields) : true;
    if (!isValid) {
        const firstErrorKey = Object.keys(errors)[0];
        const error = (errors as any)[firstErrorKey];
        const message = error?.message || error?.town?.message || error?.customerId?.message || "Please fill in all required fields.";
        toast({ variant: "destructive", title: "Missing Information", description: message });
        return;
    }

    if (!initialOrder && currentStep === 1 && onSave) {
        setIsManualSaving(true);
        try {
            const vals = getValues();
            const id = await onSave({ ...vals, customerName: customers.find(c => c.id === vals.customerId)?.name || "Unknown", status: 'Pending' } as any, true);
            if (id) { router.replace(`/orders/${id}/edit?step=3`); return; }
        } catch (e) { setIsManualSaving(false); }
        return;
    }

    if (isProductCreationMode && currentStep === 8) {
        handleFormSubmit(getValues());
        return;
    }

    setCurrentStep(Math.min(currentStep + 1, STEPS.length));
  };

  const handleFormSubmit = async (values: OrderFormValues) => {
    if (!onSave) return;
    setIsManualSaving(true);
    try {
        const updated = values.products.map(p => ({ 
            ...p, 
            colors: (p as any).colorAsAttachment ? ["As Attached Picture"] : (p.colors || []), 
            dimensions: p.width && p.height && p.depth ? { 
                width: Number(p.width), 
                height: Number(p.height), 
                depth: Number(p.depth) 
            } : undefined 
        }));
        const selectedBank = paymentSettings?.banks.find(b => b.id === values.bankId);
        const payload: any = { ...values, products: updated, status: isProductCreationMode ? undefined : (values.status === 'Pending' ? 'In Progress' : values.status), customerName: customers.find(c => c.id === values.customerId)?.name || "Unknown", bankName: selectedBank?.bankName, bankAccountNumber: selectedBank?.accountNumber };
        await onSave(payload as any, !initialOrder); 
    } catch(e) { 
        toast({ variant: "destructive", title: "Save Failed", description: "Please verify all steps." });
    } finally { setIsManualSaving(false); }
  };

  const handleSaveDraft = async () => {
    setIsManualSaving(true);
    try {
      const vals = getValues();
      await onSave?.({ ...vals, status: 'Pending' } as any, !initialOrder);
      setShowCancelDialog(false);
      router.back();
    } finally { setIsManualSaving(false); }
  }

  const filteredCustomers = customers.filter(c => {
    const search = (customerSearch || "").toLowerCase();
    return (c.name || "").toLowerCase().includes(search) || (c.phoneNumbers || []).some(p => p.number.includes(search));
  });

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const isSubmittingFinal = isExternallySubmitting || isManualSaving;
  const productCategories = productSettings?.productCategories || [];
  const isUploading = Object.keys(localUploads).length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8 space-y-4">
        <Progress value={isProductCreationMode ? ((currentStep - 2) / 6) * 100 : (currentStep / STEPS.length) * 100} className="h-2" />
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>{isProductCreationMode ? `Product Setup: Step ${currentStep - 2} of 6` : `Order Step ${currentStep} of 10`}</span>
            <span className="text-primary">{STEPS.find(s => s.id === currentStep)?.title}</span>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && (
              <Card>
                <CardHeader><CardTitle>Customer & Location</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    {isCreatingNewCustomer ? (
                        <CustomerForm onSubmit={handleCreateAndSelectCustomer} isSubmitting={newCustomerSubmitting} submitButtonText="Create & Select" onCancel={() => setIsCreatingNewCustomer(false)} />
                    ) : (
                        <div className="space-y-6">
                            <FormField control={form.control} name="customerId" render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Customer</FormLabel>
                                  <Popover open={isCustomerPopoverOpen} onOpenChange={setIsCustomerPopoverOpen}>
                                      <PopoverTrigger asChild>
                                          <div className="relative">
                                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                              <Input placeholder="Search name or phone..." className="pl-9" value={selectedCustomer ? selectedCustomer.name : customerSearch} onChange={e => { if(selectedCustomer) field.onChange(""); setCustomerSearch(e.target.value); setIsCustomerPopoverOpen(true); }} onFocus={() => setIsCustomerPopoverOpen(true)} />
                                          </div>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                          <ScrollArea className="h-64">
                                              {filteredCustomers.length === 0 && customerSearch.length > 1 && (
                                                  <Button variant="ghost" className="w-full justify-start text-primary" onClick={() => setIsCreatingNewCustomer(true)}><UserPlus className="mr-2 h-4 w-4"/> Create "{customerSearch}"</Button>
                                              )}
                                              {filteredCustomers.map(c => (
                                                  <button key={c.id} className="w-full text-left p-3 hover:bg-muted border-b" onClick={() => { field.onChange(c.id); if(c.location?.town) setValue('location.town', c.location.town); setIsCustomerPopoverOpen(false); }}>
                                                      <p className="font-bold text-sm">{c.name}</p>
                                                      <p className="text-[10px] text-muted-foreground">{(c.phoneNumbers || []).map(p => p.number).join(' | ')}</p>
                                                  </button>
                                              ))}
                                          </ScrollArea>
                                      </PopoverContent>
                                  </Popover>
                                  <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="location.town" render={({ field }) => (
                                <FormItem><FormLabel>Order Location</FormLabel><FormControl><Input placeholder="Town/City" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    )}
                </CardContent>
              </Card>
          )}

          {initialOrder && currentStep === 2 && !isProductCreationMode && (
              <Card>
                <CardHeader><CardTitle>Product Setup</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                          const cat = productSettings?.productCategories.find(c => c.name === p.category);
                          const primary = p.attachments?.[0] || p.designAttachments?.[0];
                          return (
                              <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                                  <div className="h-12 w-12 bg-background rounded-md border shrink-0 relative overflow-hidden">
                                    {primary?.url ? <Image src={primary.url} alt="product" fill className="object-cover" /> : <DynamicIcon icon={cat?.icon || 'Box'} className="h-6 w-6 m-auto" />}
                                  </div>
                                  <div className="flex-grow">
                                    <p className="font-semibold">{p.productName || `Product ${i + 1}`}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(i, -1)}><Minus className="h-3 w-3"/></Button>
                                        <span className="text-sm font-bold w-6 text-center">{p.quantity || 1}</span>
                                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(i, 1)}><Plus className="h-3 w-3"/></Button>
                                        <span className="text-[10px] text-muted-foreground uppercase font-bold ml-1">pcs</span>
                                    </div>
                                  </div>
                                  <Button variant="outline" size="sm" onClick={() => { setCurrentProductIndex(i); setCurrentStep(5); }}>Edit</Button>
                              </div>
                          )
                      })}
                </CardContent>
              </Card>
          )}

          {currentStep === 3 && (
              <Card>
                <CardHeader><CardTitle>Category</CardTitle></CardHeader>
                <CardContent>
                  <FormField control={form.control} name={`products.${currentProductIndex}.category`} render={({ field }) => (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {productCategories.map(c => { 
                          const Icon = (LucideIcons as any)[c.icon] || LucideIcons.Box; 
                          return (
                            <button key={c.name} type="button" onClick={() => field.onChange(c.name)} className={cn("p-4 border rounded-lg flex flex-col items-center gap-2 hover:bg-accent", field.value === c.name && "bg-primary text-primary-foreground")}>
                              <Icon className="h-8 w-8" />
                              <span className="text-xs font-bold uppercase">{c.name}</span>
                            </button>
                          )
                        })}
                      </div>
                  )} />
                </CardContent>
              </Card>
          )}

          {currentStep === 4 && (
              <Card>
                <CardHeader><CardTitle>Search catalog</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input placeholder="Type to filter catalog..." className="pl-9" value={catalogSearchTerm} onChange={e => setCatalogSearchTerm(e.target.value)} />
                    </div>
                    <ScrollArea className="h-[300px]">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {catalogProducts.filter(p => !p.category || p.category === getValues(`products.${currentProductIndex}.category`)).filter(p => (p.productName || "").toLowerCase().includes((catalogSearchTerm || "").toLowerCase())).map(p => (
                                <button key={p.id} type="button" className="flex items-center gap-3 p-3 border rounded-lg text-left hover:bg-accent" onClick={() => { 
                                    const up = [...getValues('products')];
                                    up[currentProductIndex] = { ...p, id: uuidv4(), quantity: 1 };
                                    setValue('products', up, { shouldDirty: true });
                                    setCurrentStep(8);
                                }}>
                                    <div className="h-10 w-10 bg-muted rounded shrink-0 relative overflow-hidden border">
                                        {p.attachments?.[0]?.url ? <Image src={p.attachments[0].url} alt="thumb" fill className="object-cover" /> : <Boxes className="h-5 w-5 m-auto opacity-20" />}
                                    </div>
                                    <span className="text-sm font-bold truncate">{p.productName}</span>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                    <Separator />
                    <Button variant="outline" className="w-full" onClick={() => setCurrentStep(5)}>Add manually (New design)</Button>
                </CardContent>
              </Card>
          )}

          {currentStep === 5 && (
              <Card>
                <CardHeader><CardTitle>Details & Files</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-3">
                            <FormField control={form.control} name={`products.${currentProductIndex}.productName`} render={({ field }) => <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        {!isProductCreationMode && (
                            <div className="md:col-span-1">
                                <FormField control={form.control} name={`products.${currentProductIndex}.quantity`} render={({ field }) => <FormItem><FormLabel>Quantity (pcs)</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value ?? 1} /></FormControl><FormMessage /></FormItem>} />
                            </div>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name={`products.${currentProductIndex}.width`} render={({ field }) => <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                        <FormField control={form.control} name={`products.${currentProductIndex}.height`} render={({ field }) => <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                        <FormField control={form.control} name={`products.${currentProductIndex}.depth`} render={({ field }) => <FormItem><FormLabel>Depth (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                    </div>

                    <FormField control={form.control} name={`products.${currentProductIndex}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                    
                    <div className="space-y-4">
                        <div className={cn("border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all", isUploading ? "bg-muted/50 border-primary/20" : "hover:border-primary/50 bg-slate-50")} onClick={() => !isUploading && fileInputRef.current?.click()}>
                            {isUploading ? (
                                <div className="space-y-3">
                                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary" />
                                    <p className="text-sm font-bold text-primary animate-pulse">Uploading files...</p>
                                </div>
                            ) : (
                                <>
                                    <UploadCloud className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                                    <p className="text-sm font-medium">Click to upload product images</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Supports JPG, PNG, WEBP</p>
                                </>
                            )}
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" disabled={isUploading} />
                        </div>

                        {isUploading && (
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    <span>Syncing with Cloud</span>
                                    <span>Please wait...</span>
                                </div>
                                <Progress value={75} className="h-1 animate-pulse" />
                            </div>
                        )}

                        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                            {watchedProducts[currentProductIndex]?.attachments?.map((att: any) => (
                                <div key={att.url} className="group relative flex flex-col gap-1">
                                    <div className="relative aspect-square rounded-md overflow-hidden border bg-muted shrink-0">
                                        <Image src={att.url} alt="upload" fill className="object-cover" />
                                        <Button variant="destructive" size="icon" className="absolute top-0.5 right-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                            const up = [...getValues('products')];
                                            up[currentProductIndex].attachments = (up[currentProductIndex].attachments || []).filter((a: any) => a.url !== att.url);
                                            setValue('products', up, { shouldDirty: true });
                                        }}><Trash2 className="h-2.5 w-2.5" /></Button>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground truncate w-full text-center px-1" title={att.fileName}>{att.fileName}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
              </Card>
          )}

          {currentStep === 6 && (
              <Card>
                <CardHeader><CardTitle>Material</CardTitle></CardHeader>
                <CardContent>
                    <FormField control={form.control} name={`products.${currentProductIndex}.material`} render={({ field }) => (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {productSettings?.materials.map(m => (
                                <button key={m.name} type="button" onClick={() => field.onChange([m.name])} className={cn("flex items-center gap-3 p-4 border rounded-lg hover:bg-accent text-left transition-all", field.value?.includes(m.name) && "bg-primary text-primary-foreground border-primary")}>
                                    <DynamicIcon icon={m.icon} className={cn("h-5 w-5", field.value?.includes(m.name) ? "text-white" : "text-muted-foreground")} />
                                    <span className="font-bold text-sm">{m.name}</span>
                                </button>
                            ))}
                        </div>
                    )} />
                </CardContent>
              </Card>
          )}

          {currentStep === 7 && (
              <Card>
                <CardHeader><CardTitle>Color</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <FormField control={form.control} name={`products.${currentProductIndex}.colorAsAttachment`} render={({ field }) => (
                        <FormItem className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                            <div><FormLabel>Color as attached picture</FormLabel></div>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                    {!watch(`products.${currentProductIndex}.colorAsAttachment`) && (
                        <FormField control={form.control} name={`products.${currentProductIndex}.colors`} render={({ field }) => (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3"><Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Wood Finishes</Label>
                                    <div className="grid grid-cols-3 gap-2">{colorSettings?.woodFinishes.map(w => (
                                        <button key={w.name} type="button" onClick={() => field.onChange([w.name])} className={cn("p-1 border rounded-lg transition-all", field.value?.includes(w.name) && "border-primary ring-2 ring-primary ring-offset-1")}>
                                            <div className="aspect-square relative rounded-md overflow-hidden"><Image src={w.imageUrl} alt={w.name} fill className="object-cover"/></div>
                                            <span className="text-[9px] font-bold uppercase truncate block mt-1">{w.name}</span>
                                        </button>
                                    ))}</div>
                                </div>
                                <div className="space-y-3"><Label className="text-xs uppercase font-bold tracking-widest text-muted-foreground">Custom Colors</Label>
                                    <div className="grid grid-cols-4 gap-2">{colorSettings?.customColors.map(c => (
                                        <button key={c.name} type="button" title={c.name} onClick={() => field.onChange([c.name])} className={cn("h-10 w-full rounded-md border transition-all", field.value?.includes(c.name) && "ring-2 ring-primary ring-offset-1 scale-95")} style={{ backgroundColor: c.colorValue }} />
                                    ))}</div>
                                </div>
                            </div>
                        )} />
                    )}
                </CardContent>
              </Card>
          )}

          {currentStep === 8 && (
              <Card>
                <CardHeader><CardTitle>Review {isProductCreationMode ? 'Design' : 'Designs'}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                        const pri = p.attachments?.[0] || p.designAttachments?.[0];
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-muted overflow-hidden relative border shadow-sm">
                                {pri?.url ? <Image src={pri.url} alt="thumb" fill className="object-cover" /> : <Boxes className="h-5 w-5 m-auto opacity-20" />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-sm block truncate">{p.productName || `Product ${i+1}`}</span>
                                {!isProductCreationMode && (
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(i, -1)}><Minus className="h-3 w-3"/></Button>
                                        <span className="text-xs font-bold w-5 text-center">{p.quantity || 1}</span>
                                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(i, 1)}><Plus className="h-3 w-3"/></Button>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">PCS</span>
                                    </div>
                                )}
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setCurrentProductIndex(i); setCurrentStep(5); }}>Edit</Button>
                          </div>
                        )
                      })}
                      {!isProductCreationMode && (
                        <Button variant="outline" className="w-full mt-4 border-dashed" onClick={() => {
                            const up = [...getValues('products'), { id: uuidv4(), productName: '', category: '', attachments: [], quantity: 1, price: 0 }];
                            setValue('products', up, { shouldDirty: true });
                            setCurrentProductIndex(up.length - 1);
                            setCurrentStep(3);
                        }}><PlusCircleIcon className="mr-2 h-4 w-4" /> Add another design item</Button>
                      )}
                </CardContent>
              </Card>
          )}

          {currentStep === 9 && !isProductCreationMode && (
              <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Pricing & Receipt</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="incomeAmount" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Base Price (Before VAT)</FormLabel>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                    <Input type="number" className="pl-8" {...field} value={field.value ?? ""} onChange={(e) => { const b = parseFloat(e.target.value) || 0; field.onChange(b); updateCalculations(b, watchedWithReceipt); }} />
                                </div>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="withReceipt" render={({ field }) => (
                            <FormItem className="flex items-center justify-between border p-4 rounded-lg bg-primary/5">
                                <div><FormLabel>Official Receipt</FormLabel><FormDescription>Includes 15% VAT.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); updateCalculations(watchedIncome || 0, v); }} /></FormControl>
                            </FormItem>
                        )} />
                        {watchedWithReceipt && (
                            <div className="space-y-4 p-4 border rounded-lg bg-accent/10">
                                <div className="space-y-1">{watchedProducts.map((p, i) => (
                                    <div key={p.id} className="flex justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                        <span>{p.productName || `Item ${i+1}`} ({p.quantity || 1} pcs)</span>
                                        <span>{formatCurrency((p.price || 0) * (p.quantity || 1))}</span>
                                    </div>
                                ))}</div>
                                <Separator className="bg-primary/20" />
                                <div className="flex justify-between text-sm"><span>VAT (15%):</span><span>+{formatCurrency(form.watch('vatAmount'))}</span></div>
                                <div className="flex justify-between font-bold border-t border-primary/40 pt-2 text-lg"><span>Total Payable:</span><span>{formatCurrency(form.watch('totalWithVat'))}</span></div>
                            </div>
                        )}
                    </CardContent>
                </Card>
              </div>
          )}

          {currentStep === 10 && !isProductCreationMode && (
              <Card>
                <CardHeader><CardTitle>Finalize Order</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="deadline" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Delivery Deadline</FormLabel>
                                <Popover><PopoverTrigger asChild><Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : "Pick a date"}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent></Popover>
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="isUrgent" render={({ field }) => (
                            <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Mark as Urgent</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="prepaidAmount" render={({ field }) => <FormItem><FormLabel>Advance Payment</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" /><Input type="number" className="pl-8" {...field} value={field.value ?? ""} /></div></FormControl></FormItem>} />
                        <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                            <FormItem><FormLabel>Payment Method</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>{paymentSettings?.methods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    </div>
                    {watch('paymentMethod') === 'Bank Transfer' && (
                        <FormField control={form.control} name="bankId" render={({ field }) => (
                            <FormItem><FormLabel>Target Bank Account</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger></FormControl>
                                    <SelectContent>{paymentSettings?.banks.map(b => <SelectItem key={b.id} value={b.id}>{b.bankName}</SelectItem>)}</SelectContent>
                                </Select>
                            </FormItem>
                        )} />
                    )}
                    <FormField control={form.control} name="paymentDetails" render={({ field }) => <FormItem><FormLabel>Internal Payment Notes</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                </CardContent>
              </Card>
          )}

          <div className="flex justify-between gap-2 sticky bottom-0 bg-background/95 py-4 z-10 border-t mt-8 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] rounded-t-lg px-2">
              <Button variant="outline" type="button" onClick={() => isDirty ? setShowCancelDialog(true) : router.back()}>Cancel</Button>
              <div className="flex items-center gap-2">
                  {((!isProductCreationMode && currentStep > 1) || (isProductCreationMode && currentStep > 3)) && (
                      <Button variant="outline" type="button" onClick={() => setCurrentStep(currentStep - 1)} disabled={isSubmittingFinal || isUploading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                  )}
                  {((!isProductCreationMode && currentStep < 10) || (isProductCreationMode && currentStep < 8)) && (
                      <Button type="button" onClick={nextStep} disabled={isSubmittingFinal || isUploading} className="min-w-[100px]">
                        {isSubmittingFinal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="ml-2 h-4 w-4" /></>}
                      </Button>
                  )}
                  {((!isProductCreationMode && currentStep === 10) || (isProductCreationMode && currentStep === 8)) && (
                      <Button type="button" onClick={form.handleSubmit(handleFormSubmit, (e) => {
                          const msgs = Object.entries(e).map(([k,v]) => `${k}: ${(v as any).message || (v as any).productName?.message}`).join(". ");
                          toast({ variant: "destructive", title: "Missing Fields", description: msgs || "Check all steps." });
                      })} disabled={isSubmittingFinal || isUploading} className="min-w-[120px] bg-primary">
                        {isSubmittingFinal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialOrder ? submitButtonText : (isProductCreationMode ? 'Create Product' : 'Finish Order'))}
                      </Button>
                  )}
              </div>
          </div>
        </form>
      </Form>
      
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Unsaved Changes</AlertDialogTitle><AlertDialogDescription>Do you want to save this as a draft before leaving?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            {!isProductCreationMode && <AlertDialogAction onClick={handleSaveDraft} className="bg-primary">Save Draft</AlertDialogAction>}
            <AlertDialogAction onClick={() => router.back()} className="bg-destructive hover:bg-destructive/90">Discard</AlertDialogAction>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>Stay</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
