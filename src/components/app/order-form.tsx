
"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
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
import { Badge } from "@/components/ui/badge"
import { DollarSign, UserPlus, Loader2, UploadCloud, File as FileIcon, Trash2, ArrowLeft, ArrowRight, PlusCircle as PlusCircleIcon, Receipt, CheckCircle, Boxes, Palette, Ruler, CreditCard, Calendar as CalendarIcon, Phone, Search, PlusCircle, User, Plus, Minus, ImageIcon, CheckCircle2, ListChecks, Package, X, FlaskConical, Library } from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderStatus, Product, OrderAttachment, BOMItem } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback, useMemo } from "react"
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
import { useSecondaryItems } from "@/hooks/use-secondary-items"
import * as LucideIcons from 'lucide-react'
import { v4 as uuidv4 } from "uuid"
import { useProducts } from "@/hooks/use-products"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Calendar } from "@/components/ui/calendar"
import { DynamicIcon } from "../ui/dynamic-icon"

const bomItemSchema = z.object({
  itemId: z.string(),
  name: z.string(),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  unit: z.string(),
});

const productSchema = z.object({
  id: z.string(),
  productName: z.string().min(1, "Product name required."),
  category: z.string().min(1, "Category is required."),
  description: z.string().optional(),
  billOfMaterials: z.string().optional(),
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
  prepaidAmount: z.coerce.number().min(0).default(0),
  mainImageUrl: z.string().optional(),
  bomItems: z.array(bomItemSchema).optional(),
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
  isSample: z.boolean().default(false),
})

type OrderFormValues = z.infer<typeof formSchema>

interface OrderFormProps {
  order?: Order;
  onSave?: (data: Omit<Order, 'id' | 'creationDate'>, isNew: boolean) => Promise<string | undefined>;
  submitButtonText?: string;
  isSubmitting?: boolean;
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

function UploadingCard({ name, progress }: { name: string, progress: number }) {
    return (
        <Card className="bg-muted/30 border-dashed border-primary/20 animate-pulse overflow-hidden">
            <CardContent className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-[10px] font-bold truncate flex-1 uppercase tracking-tighter">{name}</p>
                    <span className="text-[10px] font-bold text-primary">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1" />
            </CardContent>
        </Card>
    );
}

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false }: OrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, addCustomer } = useCustomers();
  const { products: catalogProducts, loading: catalogLoading } = useProducts();
  const { settings: colorSettings } = useColorSettings();
  const { productSettings } = useProductSettings();
  const { settings: paymentSettings } = usePaymentSettings();
  const { items: secondaryItems, loading: secondaryLoading } = useSecondaryItems();
  const { uploadFile, uploadProgress } = useOrders();
  
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(searchParams.get('step') ? parseInt(searchParams.get('step')!) : 1);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [customerSearch, setCustomerSearch] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [isItemPopoverOpen, setIsItemPopoverOpen] = useState(false);
  const [activeUploads, setActiveUploads] = useState<{ id: string; name: string; progressKey: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultProduct: Product = { id: uuidv4(), productName: '', category: '', description: '', billOfMaterials: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0, quantity: 1, bomItems: [], prepaidAmount: 0 };
    const defaultValues = { products: [defaultProduct], isUrgent: false, status: "Pending" as OrderStatus, incomeAmount: 0, customerId: '', creationDate: new Date(), deadline: new Date(), location: { town: '' }, withReceipt: false, vatAmount: 0, totalWithVat: 0, paymentMethod: 'Cash', isSample: false, prepaidAmount: 0 };
    if (!orderToMap) return defaultValues as OrderFormValues;
    const products = orderToMap.products?.map(p => ({ 
        ...p, 
        colorAsAttachment: p.colors?.includes("As Attached Picture"), 
        width: p.dimensions?.width, 
        height: p.dimensions?.height, 
        depth: p.dimensions?.depth, 
        quantity: p.quantity || 1, 
        bomItems: p.bomItems || [],
        prepaidAmount: p.prepaidAmount || orderToMap.prepaidAmount || 0 
    })) || [defaultProduct];
    return { ...defaultValues, ...orderToMap, creationDate: toDate(orderToMap.creationDate) || new Date(), deadline: toDate(orderToMap.deadline) || new Date(), location: orderToMap.location || { town: '' }, products } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({ resolver: zodResolver(formSchema), defaultValues: mapOrderToFormValues(initialOrder) });
  const { setValue, getValues, watch, trigger, control, formState: { isDirty, errors } } = form;
  const watchedProducts = watch("products");
  const watchedWithReceipt = watch("withReceipt");
  const watchedIncome = watch("incomeAmount");
  const selectedCustomerId = watch("customerId");
  const watchedStatus = watch("status");
  const watchedIsSample = watch("isSample");

  const currentCategory = watch(`products.${currentProductIndex}.category`);

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
  const totalPrepaidValue = watchedProducts.reduce((sum, p) => sum + (Number(p.prepaidAmount) || 0), 0);
  
  useEffect(() => { 
    setValue('incomeAmount', totalIncomeValue);
    setValue('prepaidAmount', totalPrepaidValue);
    updateCalculations(totalIncomeValue, watchedWithReceipt);
  }, [totalIncomeValue, totalPrepaidValue, setValue, updateCalculations, watchedWithReceipt]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      
      files.forEach(file => {
          const taskId = uuidv4();
          const progressKey = `${file.name}-${taskId}`;
          
          setActiveUploads(prev => [...prev, { id: taskId, name: file.name, progressKey }]);

          uploadFile(file, progressKey).then(att => {
              const currentProducts = [...getValues('products')];
              const p = currentProducts[currentProductIndex];
              if (p) {
                  p.attachments = [...(p.attachments || []), att];
                  if (!p.mainImageUrl) p.mainImageUrl = att.url;
                  setValue('products', currentProducts, { shouldDirty: true });
              }
              setActiveUploads(prev => prev.filter(u => u.id !== taskId));
          }).catch(() => {
              setActiveUploads(prev => prev.filter(u => u.id !== taskId));
          });
      });
      
      e.target.value = '';
    }
  };

  const setProductMainImage = (index: number, url: string) => {
      const updated = [...getValues('products')];
      if (updated[index]) {
          updated[index].mainImageUrl = url;
          setValue('products', updated, { shouldDirty: true });
      }
  };

  const handleCreateAndSelectCustomer = async (data: any) => {
    setNewCustomerSubmitting(true);
    try {
        const id = await addCustomer(data);
        setValue("customerId", id, { shouldDirty: true });
        setIsCreatingNewCustomer(false);
        setIsCustomerDropdownOpen(false);
        setCustomerSearch("");
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
    if(currentStep === 1) fields = watchedIsSample ? ['location.town'] : ['customerId', 'location.town'];
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
            const id = await onSave({ ...vals, customerName: vals.isSample ? "Workshop Sample" : (customers.find(c => c.id === vals.customerId)?.name || "Unknown"), status: 'Pending' } as any, true);
            if (id) { router.replace(`/orders/${id}/edit?step=3`); return; }
        } catch (e) { setIsManualSaving(false); }
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
        const payload: any = { ...values, products: updated, status: values.status === 'Pending' ? 'In Progress' : values.status, customerName: values.isSample ? "Workshop Sample" : (customers.find(c => c.id === values.customerId)?.name || "Unknown"), bankName: selectedBank?.bankName, bankAccountNumber: selectedBank?.accountNumber };
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
  const isAnyUploading = activeUploads.length > 0;

  const addItemToBOM = (pIndex: number, item: any) => {
      const products = [...getValues('products')];
      const p = products[pIndex];
      if (!p) return;
      p.bomItems = [...(p.bomItems || []), {
          itemId: item.id,
          name: item.name,
          quantity: 1,
          unit: item.unit
      }];
      setValue('products', products, { shouldDirty: true });
      setIsItemPopoverOpen(false);
      setItemSearch("");
  };

  const removeBOMItem = (pIndex: number, bIndex: number) => {
      const products = [...getValues('products')];
      const p = products[pIndex];
      if (!p || !p.bomItems) return;
      p.bomItems = p.bomItems.filter((_, i) => i !== bIndex);
      setValue('products', products, { shouldDirty: true });
  };

  const updateBOMQuantity = (pIndex: number, bIndex: number, val: string) => {
    const products = [...getValues('products')];
    const p = products[pIndex];
    if (!p || !p.bomItems) return;
    p.bomItems[bIndex].quantity = parseFloat(val) || 0;
    setValue('products', products, { shouldDirty: true });
  };

  const filteredSecondaryItems = secondaryItems.filter(item => 
    item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
    item.category?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  const isDesigning = watchedStatus === 'Designing';

  const filteredCatalogProducts = useMemo(() => {
    if (!catalogProducts) return [];
    
    return catalogProducts
      .filter(p => p.productName && p.productName.trim() !== "") 
      .filter(p => {
          if (!currentCategory) return true;
          return p.category === currentCategory || !p.category;
      })
      .filter(p => (p.productName || "").toLowerCase().includes((catalogSearchTerm || "").toLowerCase())) 
      .sort((a, b) => (a.isStandard === b.isStandard ? 0 : a.isStandard ? -1 : 1)); 
  }, [catalogProducts, currentCategory, catalogSearchTerm]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8 space-y-4">
        <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>Order Step {currentStep} of 10</span>
            <span className="text-primary">{STEPS.find(s => s.id === currentStep)?.title}</span>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && (
              <Card>
                <CardHeader className="pb-3 border-b mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>Project Foundation</CardTitle>
                            <CardDescription>Define if this is a customer project or workshop sample.</CardDescription>
                        </div>
                        <FormField control={form.control} name="isSample" render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                                <FlaskConical className="h-4 w-4 text-orange-600" />
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-orange-700 cursor-pointer">Sample Mode</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} className="scale-75 data-[state=checked]:bg-orange-600" /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                    {watchedIsSample ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-xl bg-orange-50/20 animate-in fade-in zoom-in-95 duration-200">
                            <FlaskConical className="h-10 w-10 mx-auto mb-3 text-orange-400 opacity-50" />
                            <p className="text-sm font-bold text-orange-900">Workshop Sample Mode Active</p>
                            <p className="text-xs text-muted-foreground mt-1">This project is for internal inventory and display. No customer required.</p>
                        </div>
                    ) : isCreatingNewCustomer ? (
                        <div className="p-4 border rounded-lg bg-muted/20 animate-in fade-in zoom-in-95 duration-200">
                             <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="font-bold text-sm">Create New Customer</h3>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsCreatingNewCustomer(false)}><X className="h-4 w-4" /></Button>
                            </div>
                            <CustomerForm onSubmit={handleCreateAndSelectCustomer} isSubmitting={newCustomerSubmitting} submitButtonText="Save & Select" onCancel={() => setIsCreatingNewCustomer(false)} />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <FormField control={form.control} name="customerId" render={({ field }) => (
                                <FormItem>
                                  <div className="flex justify-between items-center mb-2">
                                    <FormLabel>Customer Name</FormLabel>
                                    {!selectedCustomer && (
                                        <Button variant="outline" size="sm" className="h-7 text-[10px] uppercase font-bold" onClick={() => setIsCreatingNewCustomer(true)}>
                                            <PlusCircle className="mr-1 h-3 w-3" /> New Customer
                                        </Button>
                                    )}
                                  </div>
                                  {selectedCustomer ? (
                                      <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-1">
                                          <div className="flex items-center gap-3">
                                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                  <User className="h-5 w-5 text-primary" />
                                              </div>
                                              <div>
                                                  <p className="font-bold text-sm">{selectedCustomer.name}</p>
                                                  <p className="text-xs text-muted-foreground">{selectedCustomer.phoneNumbers?.[0]?.number || 'No phone'}</p>
                                              </div>
                                          </div>
                                          <Button variant="ghost" size="sm" onClick={() => { field.onChange(""); setCustomerSearch(""); }} className="text-xs">Change</Button>
                                      </div>
                                  ) : (
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                                            <Input 
                                                ref={customerSearchRef}
                                                placeholder="Search by name or phone..." 
                                                className="pl-9" 
                                                autoComplete="off"
                                                value={customerSearch} 
                                                onChange={e => {
                                                    setCustomerSearch(e.target.value);
                                                    setIsCustomerDropdownOpen(true);
                                                }} 
                                                onFocus={() => setIsCustomerDropdownOpen(true)}
                                            />
                                        </div>
                                        
                                        {isCustomerDropdownOpen && (customerSearch.length > 0 || filteredCustomers.length > 0) && (
                                            <Card className="absolute top-full left-0 right-0 z-50 mt-1 shadow-xl border overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                <ScrollArea className="max-h-[300px]">
                                                    {filteredCustomers.length > 0 ? (
                                                        filteredCustomers.map(c => (
                                                            <button 
                                                                key={c.id} 
                                                                type="button"
                                                                className="w-full text-left p-3 hover:bg-muted border-b last:border-0 transition-colors" 
                                                                onClick={() => { 
                                                                    field.onChange(c.id); 
                                                                    if(c.location?.town) setValue('location.town', c.location.town); 
                                                                    setIsCustomerDropdownOpen(false); 
                                                                    setCustomerSearch("");
                                                                }}
                                                            >
                                                                <p className="font-bold text-sm">{c.name}</p>
                                                                <p className="text-[10px] text-muted-foreground">{(c.phoneNumbers || []).map(p => p.number).join(' | ')}</p>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center">
                                                            <p className="text-sm text-muted-foreground mb-3">No matching customers found.</p>
                                                            <Button size="sm" className="w-full" onClick={() => setIsCreatingNewCustomer(true)}>
                                                                <PlusCircle className="mr-2 h-4 w-4" /> Create "{customerSearch}"
                                                            </Button>
                                                        </div>
                                                    )}
                                                </ScrollArea>
                                            </Card>
                                        )}
                                        {isCustomerDropdownOpen && (
                                             <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsCustomerDropdownOpen(false)} />
                                        )}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                    <FormField control={form.control} name="location.town" render={({ field }) => (
                        <FormItem><FormLabel>Order Location (City/Town)</FormLabel><FormControl><Input placeholder="e.g. Addis Ababa" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
              </Card>
          )}

          {initialOrder && currentStep === 2 && (
              <Card>
                <CardHeader><CardTitle>Product Setup</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                          const cat = productSettings?.productCategories.find(c => c.name === p.category);
                          const primary = p.mainImageUrl || p.attachments?.[0]?.url || p.designAttachments?.[0]?.url;
                          return (
                              <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                                  <div className="h-12 w-12 bg-background rounded-md border shrink-0 relative overflow-hidden">
                                    {primary ? <Image src={primary} alt="product" fill className="object-cover" /> : <DynamicIcon icon={cat?.icon || 'Box'} className="h-6 w-6 m-auto" />}
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
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div>
                        <CardTitle>Catalog Design</CardTitle>
                        <CardDescription>Select an existing design or create a new one.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-40" />
                        <Input placeholder="Search catalog by design name..." className="pl-9" value={catalogSearchTerm} onChange={e => setCatalogSearchTerm(e.target.value)} />
                    </div>
                    <ScrollArea className="h-[400px] pr-2">
                        {catalogLoading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2">
                                <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-40">Loading designs...</p>
                            </div>
                        ) : filteredCatalogProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {filteredCatalogProducts.map(p => {
                                    const catalogThumb = p.mainImageUrl || p.attachments?.[0]?.url || p.designAttachments?.[0]?.url;
                                    return (
                                        <button key={p.id} type="button" className="flex items-center gap-3 p-3 border rounded-xl text-left hover:bg-accent group transition-all" onClick={() => { 
                                            const up = [...getValues('products')];
                                            up[currentProductIndex] = { ...p, id: uuidv4(), quantity: 1 };
                                            setValue('products', up, { shouldDirty: true });
                                            setCurrentStep(8);
                                        }}>
                                            <div className="h-12 w-12 bg-muted rounded-lg shrink-0 relative overflow-hidden border shadow-sm group-hover:scale-105 transition-transform">
                                                {catalogThumb ? <Image src={catalogThumb} alt="thumb" fill className="object-cover" /> : <Boxes className="h-6 w-6 m-auto opacity-20" />}
                                            </div>
                                            <div className="min-w-0">
                                                <span className="text-sm font-bold truncate block">{p.productName}</span>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {p.isStandard ? (
                                                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-primary/5 text-primary border-primary/10 font-black uppercase">Standard</Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[8px] h-3.5 px-1 bg-muted text-muted-foreground uppercase font-bold">Custom</Badge>
                                                    )}
                                                    <span className="text-[10px] text-muted-foreground">{p.category}</span>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-muted/20 rounded-xl border-2 border-dashed">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                                    <Library className="h-8 w-8 text-muted-foreground opacity-30" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-muted-foreground">No matching designs found</p>
                                    <p className="text-xs text-muted-foreground/60 max-w-[200px] mx-auto mt-1">Try a different search term or create a new manual design.</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                    <Separator />
                    <Button variant="outline" className="w-full h-12 rounded-xl border-dashed hover:bg-primary/5 hover:border-primary/50 group" onClick={() => setCurrentStep(5)}>
                        <Plus className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" /> 
                        Create a New Design Piece
                    </Button>
                </CardContent>
              </Card>
          )}

          {currentStep === 5 && (
              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="md:col-span-2">
                            <FormField control={form.control} name={`products.${currentProductIndex}.productName`} render={({ field }) => <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                        <div className="md:col-span-1">
                             <FormField control={form.control} name={`products.${currentProductIndex}.price`} render={({ field }) => <FormItem><FormLabel>Base Price</FormLabel><FormControl><div className="relative"><DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 opacity-50" /><Input type="number" className="pl-8" {...field} value={field.value ?? 0} /></div></FormControl><FormMessage /></FormItem>} />
                        </div>
                        <div className="md:col-span-1">
                            <FormField control={form.control} name={`products.${currentProductIndex}.quantity`} render={({ field }) => <FormItem><FormLabel>Quantity (pcs)</FormLabel><FormControl><Input type="number" min="1" {...field} value={field.value ?? 1} /></FormControl><FormMessage /></FormItem>} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <FormField control={form.control} name={`products.${currentProductIndex}.width`} render={({ field }) => <FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                        <FormField control={form.control} name={`products.${currentProductIndex}.height`} render={({ field }) => <FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                        <FormField control={form.control} name={`products.${currentProductIndex}.depth`} render={({ field }) => <FormItem><FormLabel>Depth (cm)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                    </div>

                    <FormField control={form.control} name={`products.${currentProductIndex}.description`} render={({ field }) => <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                    
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-bold">
                            <ImageIcon className="h-4 w-4 text-primary" /> Project Visuals & Main Thumbnail
                        </div>
                        <div className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all hover:border-primary/50 bg-slate-50" onClick={() => fileInputRef.current?.click()}>
                            <UploadCloud className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm font-medium">Click to upload product images</p>
                            <p className="text-[10px] text-muted-foreground mt-1">Supports JPG, PNG, WEBP</p>
                            <input ref={fileInputRef} type="file" multiple onChange={handleFileUpload} className="hidden" />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                            {watchedProducts[currentProductIndex]?.attachments?.map((att: any) => (
                                <div key={att.url} className={cn(
                                    "group relative flex flex-col gap-1 aspect-square rounded-lg overflow-hidden border-2 transition-all",
                                    watchedProducts[currentProductIndex].mainImageUrl === att.url ? "border-primary shadow-md" : "border-muted"
                                )}>
                                    <Image src={att.url} alt="upload" fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                                        <Button 
                                            variant="secondary" 
                                            size="sm" 
                                            className="h-7 text-[9px] font-bold uppercase rounded-full w-full"
                                            onClick={() => setProductMainImage(currentProductIndex, att.url)}
                                        >
                                            {watchedProducts[currentProductIndex].mainImageUrl === att.url ? <CheckCircle2 className="h-3 w-3 mr-1" /> : "Set Main"}
                                        </Button>
                                        <Button variant="destructive" size="sm" className="h-7 text-[9px] font-bold uppercase rounded-full w-full" onClick={() => {
                                            const up = [...getValues('products')];
                                            up[currentProductIndex].attachments = (up[currentProductIndex].attachments || []).filter((a: any) => a.url !== att.url);
                                            if (up[currentProductIndex].mainImageUrl === att.url) up[currentProductIndex].mainImageUrl = up[currentProductIndex].attachments[0]?.url;
                                            setValue('products', up, { shouldDirty: true });
                                        }}><Trash2 className="h-3 w-3 mr-1" /> Remove</Button>
                                    </div>
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                        <p className="text-[8px] text-white truncate text-center font-medium">{att.fileName}</p>
                                    </div>
                                </div>
                            ))}
                            {activeUploads.map(task => (
                                <div key={task.id} className="aspect-square">
                                    <UploadingCard name={task.name} progress={uploadProgress[task.progressKey] || 0} />
                                </div>
                            ))}
                        </div>
                    </div>

                    {isDesigning && (
                        <div className="space-y-4 pt-6 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-bold flex items-center gap-2">
                                    <ListChecks className="h-4 w-4 text-primary" /> Technical Bill of Materials
                                </Label>
                                <Popover open={isItemPopoverOpen} onOpenChange={setIsItemPopoverOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8">
                                            <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add from Catalog
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
                                                    onClick={() => addItemToBOM(currentProductIndex, item)}
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
                            </div>

                            <div className="space-y-2">
                                {watchedProducts[currentProductIndex]?.bomItems?.map((item: BOMItem, bIdx: number) => (
                                    <div key={bIdx} className="flex items-center gap-3 p-2 border rounded-lg bg-muted/20 group">
                                        <div className="flex-grow min-w-0">
                                            <p className="text-xs font-bold truncate">{item.name}</p>
                                            <p className="text-[9px] text-muted-foreground uppercase">{item.unit}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                className="h-8 w-16 text-xs text-right font-bold" 
                                                value={item.quantity}
                                                onChange={(e) => updateBOMQuantity(currentProductIndex, bIdx, e.target.value)}
                                            />
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                type="button" 
                                                className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100"
                                                onClick={() => removeBOMItem(currentProductIndex, bIdx)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <FormField control={form.control} name={`products.${currentProductIndex}.billOfMaterials`} render={({ field }) => <FormItem><FormLabel className="text-xs text-muted-foreground">Manual Technical Notes</FormLabel><FormControl><Textarea rows={3} placeholder="Special assembly instructions..." className="font-mono text-xs" {...field} value={field.value ?? ""} /></FormControl></FormItem>} />
                        </div>
                    )}
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
                <CardHeader><CardTitle>Review Designs</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                        const pri = p.mainImageUrl || p.attachments?.[0]?.url || p.designAttachments?.[0]?.url;
                        return (
                          <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded bg-muted overflow-hidden relative border shadow-sm">
                                {pri ? <Image src={pri} alt="thumb" fill className="object-cover" /> : <Boxes className="h-6 w-6 m-auto opacity-20" />}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-sm block truncate">{p.productName || `Product ${i+1}`}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(i, -1)}><Minus className="h-3 w-3"/></Button>
                                    <span className="text-xs font-bold w-5 text-center">{p.quantity || 1}</span>
                                    <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(i, 1)}><Plus className="h-3 w-3"/></Button>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">PCS</span>
                                </div>
                              </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => { setCurrentProductIndex(i); setCurrentStep(5); }}>Edit</Button>
                          </div>
                        )
                      })}
                      <Button variant="outline" className="w-full mt-4 border-dashed" onClick={() => {
                          const up = [...getValues('products'), { id: uuidv4(), productName: '', category: '', billOfMaterials: '', attachments: [], quantity: 1, price: 0, prepaidAmount: 0 }];
                          setValue('products', up, { shouldDirty: true });
                          setCurrentProductIndex(up.length - 1);
                          setCurrentStep(3);
                      }}><PlusCircleIcon className="mr-2 h-4 w-4" /> Add another design item</Button>
                </CardContent>
              </Card>
          )}

          {currentStep === 9 && (
              <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Advance Payments</CardTitle>
                        <CardDescription>Enter values for each product item in this order.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            {watchedProducts.map((p, i) => (
                                <div key={p.id || i} className="p-4 border rounded-xl bg-muted/10 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <p className="font-bold text-sm truncate max-w-[200px]">{p.productName || `Item ${i+1}`}</p>
                                        <Badge variant="outline" className="text-[10px] uppercase font-black">{p.category}</Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`products.${i}.price`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs">Base Unit Price</FormLabel>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 opacity-50" />
                                                        <Input 
                                                            type="number" 
                                                            className="pl-8 h-9 text-sm" 
                                                            {...field} 
                                                        />
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`products.${i}.prepaidAmount`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-xs text-primary">Advance Payment</FormLabel>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-primary/50" />
                                                        <Input 
                                                            type="number" 
                                                            className="pl-8 h-9 text-sm border-primary/20 bg-primary/5" 
                                                            {...field} 
                                                        />
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                        <div className="text-[10px] uppercase font-bold text-muted-foreground">Item Total: {formatCurrency((p.price || 0) * (p.quantity || 1))}</div>
                                        <div className="text-[10px] uppercase font-bold text-destructive">
                                            Balance: {formatCurrency(((p.price || 0) * (p.quantity || 1)) - (p.prepaidAmount || 0))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Separator />

                        <FormField control={form.control} name="withReceipt" render={({ field }) => (
                            <FormItem className="flex items-center justify-between border p-4 rounded-lg bg-primary/5">
                                <div><FormLabel>Official Receipt</FormLabel><FormDescription>Includes 15% VAT.</FormDescription></div>
                                <FormControl><Switch checked={field.value} onCheckedChange={(v) => { field.onChange(v); updateCalculations(watchedIncome || 0, v); }} /></FormControl>
                            </FormItem>
                        )} />

                        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 shadow-lg">
                            <div className="flex justify-between text-xs opacity-70">
                                <span>Total Items Value:</span>
                                <span>{formatCurrency(totalIncomeValue)}</span>
                            </div>
                            {watchedWithReceipt && (
                                <div className="flex justify-between text-xs opacity-70">
                                    <span>VAT (15%):</span>
                                    <span>+{formatCurrency(form.watch('vatAmount'))}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/10">
                                <span>Grand Total:</span>
                                <span className="text-primary-foreground">{formatCurrency(watchedWithReceipt ? form.watch('totalWithVat') : totalIncomeValue)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-primary-foreground/80">
                                <span>Total Prepaid:</span>
                                <span>-{formatCurrency(totalPrepaidValue)}</span>
                            </div>
                            <div className="flex justify-between text-lg font-black pt-1 text-emerald-400">
                                <span>Net Balance Due:</span>
                                <span>{formatCurrency((watchedWithReceipt ? form.watch('totalWithVat') : totalIncomeValue) - totalPrepaidValue)}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
              </div>
          )}

          {currentStep === 10 && (
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
                  {currentStep > 1 && (
                      <Button variant="outline" type="button" onClick={() => setCurrentStep(currentStep - 1)} disabled={isSubmittingFinal || isAnyUploading}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                      </Button>
                  )}
                  {currentStep < 10 && (
                      <Button type="button" onClick={nextStep} disabled={isSubmittingFinal || isAnyUploading} className="min-w-[100px]">
                        {isSubmittingFinal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <>Next <ArrowRight className="ml-2 h-4 w-4" /></>}
                      </Button>
                  )}
                  {currentStep === 10 && (
                      <Button type="button" onClick={form.handleSubmit(handleFormSubmit, (e) => {
                          const msgs = Object.entries(e).map(([k,v]) => `${k}: ${(v as any).message || (v as any).productName?.message}`).join(". ");
                          toast({ variant: "destructive", title: "Missing Fields", description: msgs || "Check all steps." });
                      })} disabled={isSubmittingFinal || isAnyUploading} className="min-w-[120px] bg-primary">
                        {isSubmittingFinal ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (initialOrder ? submitButtonText : 'Finish Order')}
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
            <AlertDialogAction onClick={handleSaveDraft} className="bg-primary">Save Draft</AlertDialogAction>
            <AlertDialogAction onClick={() => router.back()} className="bg-destructive hover:bg-destructive/90">Discard</AlertDialogAction>
            <AlertDialogCancel onClick={() => setShowCancelDialog(false)}>Stay</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
