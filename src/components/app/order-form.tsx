
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
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Calendar as CalendarIcon, DollarSign, UserPlus, X, Loader2, Paperclip, UploadCloud, File as FileIcon, Trash2, Mic, Square, Download, Play, Pause, ArrowLeft, ArrowRight, User, Phone, MapPin, Ruler, Search, PlusCircle as PlusCircleIcon, Edit, QrCode, Hash } from "lucide-react"
import { cn, compressImage } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderAttachment, Customer, OrderStatus, Product } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback, useTransition, useMemo } from "react"
import Image from "next/image"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useColorSettings } from "@/hooks/use-color-settings"
import { useOrders } from "@/hooks/use-orders"
import { Progress } from "../ui/progress"
import { useProductSettings } from "@/hooks/use-product-settings"
import * as LucideIcons from 'lucide-react';
import { v4 as uuidv4 } from "uuid"
import { useProducts } from "@/hooks/use-products"
import { ScrollArea } from "../ui/scroll-area"
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
  testDate: z.date().optional(),
  isUrgent: z.boolean().default(false),
})

type OrderFormValues = z.infer<typeof formSchema>

interface OrderFormProps {
  order?: Order;
  onSave?: (data: Omit<Order, 'id' | 'creationDate'>, isNew: boolean) => Promise<string | undefined>;
  submitButtonText?: string;
  isSubmitting?: boolean;
  isProductCreationMode?: boolean;
}

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

const SleekAudioPlayer = ({ src, onSave, onDiscard }: { src: string, onSave: () => void, onDiscard: () => void }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const togglePlay = () => {
        if (audioRef.current) {
            isPlaying ? audioRef.current.pause() : audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };
    return (
        <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
                <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} hidden />
                <Button type="button" variant="ghost" size="icon" onClick={togglePlay}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
                <div className="text-sm text-muted-foreground">Voice Memo Preview</div>
                <div className="flex-grow" />
                <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>Discard</Button>
                <Button type="button" size="sm" onClick={onSave}>Add to Order</Button>
            </div>
        </div>
    );
};

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const STEPS = [
  { id: 1, title: 'Customer & Location', fields: ['customerId', 'location'] },
  { id: 2, title: 'Product Setup', fields: [] },
  { id: 3, title: 'Product Category', fields: ['products.0.category'] },
  { id: 4, title: 'Product Source', fields: [] },
  { id: 5, title: 'Product Details & Attachments', fields: ['products.0.productName', 'products.0.description', 'products.0.width', 'products.0.height', 'products.0.depth'] },
  { id: 6, title: 'Material', fields: ['products.0.material'] },
  { id: 7, title: 'Color', fields: ['products.0.colors'] },
  { id: 8, title: 'Review Products', fields: [] },
  { id: 9, title: 'Pricing & Payment', fields: ['incomeAmount', 'prepaidAmount', 'paymentDetails'] },
  { id: 10, title: 'Scheduling & Status', fields: ['status', 'creationDate', 'deadline', 'isUrgent'] }
];

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false, isProductCreationMode = false }: OrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { products: catalogProducts, addProduct } = useProducts();
  const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
  const { productSettings } = useProductSettings();
  const { getOrderById, updateOrder, addAttachment, uploadProgress, removeAttachment } = useOrders();
  
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(isProductCreationMode ? 3 : 1);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [catalogSearchTerm, setCatalogSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialLoadRef = useRef(true);
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultProduct: Product = { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0 };
    const defaultValues = { products: [defaultProduct], isUrgent: false, status: "Pending" as OrderStatus, incomeAmount: 0, prepaidAmount: 0, customerId: '', creationDate: new Date(), deadline: new Date(), location: { town: '' } };
    if (!orderToMap) return defaultValues as OrderFormValues;
    const products = orderToMap.products && orderToMap.products.length > 0 ? orderToMap.products.map(p => ({ ...p, colorAsAttachment: p.colors?.includes("As Attached Picture"), width: p.dimensions?.width, height: p.dimensions?.height, depth: p.dimensions?.depth })) : [defaultProduct];
    return { ...defaultValues, ...orderToMap, creationDate: toDate(orderToMap.creationDate) || new Date(), deadline: toDate(orderToMap.deadline) || new Date(), testDate: toDate(orderToMap.testDate), location: orderToMap.location || { town: '' }, products } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({ resolver: zodResolver(formSchema), defaultValues: mapOrderToFormValues(initialOrder) });
  const { formState: { isDirty, dirtyFields }, getValues, watch, trigger, setValue, control } = form;
  const watchedProducts = watch("products");
  const watchedCategory = watch(`products.${currentProductIndex}.category`);

  useEffect(() => {
    if (!isInitialLoadRef.current) return;
    const stepFromUrl = searchParams.get('step');
    if (stepFromUrl) setCurrentStep(parseInt(stepFromUrl, 10));
    else if (initialOrder) {
      if (initialOrder.status === 'Pending' && (!initialOrder.products || initialOrder.products.length === 0 || !initialOrder.products[0].category)) setCurrentStep(3);
      else setCurrentStep(2);
    } else if (!isProductCreationMode) setCurrentStep(1);
    isInitialLoadRef.current = false;
  }, [initialOrder, searchParams, isProductCreationMode]);

  const getStepTitle = () => STEPS.find(s => s.id === currentStep)?.title || '';
  const getProgress = () => (currentStep / STEPS.length) * 100;

  const filteredCatalogProducts = useMemo(() => {
    if (!catalogProducts) return [];
    return catalogProducts.filter(p => p.category === watchedCategory && (p.productName?.toLowerCase().includes(catalogSearchTerm.toLowerCase()) ?? true));
  }, [catalogProducts, watchedCategory, catalogSearchTerm]);

  const nextStep = async () => {
    let fieldsToValidate: any = [];
    const stepConfig = STEPS.find(s => s.id === currentStep);
    if (stepConfig) {
      if(currentStep === 1) fieldsToValidate = stepConfig.fields || [];
      else if (currentStep === 3) fieldsToValidate = [`products.${currentProductIndex}.category`];
      else if (currentStep === 9) fieldsToValidate = ['incomeAmount'];
    }
    const isValid = fieldsToValidate.length > 0 ? await trigger(fieldsToValidate) : true;
    if (!isValid) return;

    if (!initialOrder && currentStep === 1) {
        if (!onSave) return;
        setIsManualSaving(true);
        const values = getValues();
        const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown";
        
        startTransition(async () => {
            try {
                const id = await onSave({ ...values, customerName, status: 'Pending', creationDate: values.creationDate || new Date(), deadline: values.deadline || new Date() } as any, true);
                if (id) router.replace(`/orders/${id}/edit?step=3`);
            } catch (error) {
                console.error(error);
            } finally {
                setIsManualSaving(false);
            }
        });
        return;
    }
    
    let nextStepNumber = currentStep + 1;
    if (currentStep === 3) nextStepNumber = 4;
    
    startTransition(() => {
        setCurrentStep(prev => Math.min(nextStepNumber, STEPS.length));
    });
  };

  const prevStep = () => {
     let nextStepVal = currentStep - 1;
     if (initialOrder && [5, 6, 7].includes(currentStep)) nextStepVal = 4;
     else if (currentStep === 8) nextStepVal = isProductCreationMode ? 7 : 4;
     else if (currentStep === 4) nextStepVal = 3;
     else if (currentStep === 3 && !isProductCreationMode) nextStepVal = 1;
     startTransition(() => setCurrentStep(Math.max(nextStepVal, 1)));
  };

  const handleExistingProductSelect = (product: Product) => {
    const updatedProducts = [...getValues('products')];
    updatedProducts[currentProductIndex] = { ...product, price: Number(product.price) || 0, id: uuidv4() };
    setValue('products', updatedProducts, { shouldDirty: true, shouldValidate: true });
    startTransition(() => setCurrentStep(8));
  };
  
  const handleAddAnotherProduct = () => {
    const currentProducts = getValues('products');
    setValue('products', [...currentProducts, { id: uuidv4(), productName: '', category: '', description: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0 }], { shouldDirty: true });
    startTransition(() => { setCurrentProductIndex(currentProducts.length); setCurrentStep(3); });
  };

  const handleEditProduct = (index: number) => {
      startTransition(() => { setCurrentProductIndex(index); setCurrentStep(5); });
  }

  const handleRemoveProduct = (index: number) => {
    const currentProducts = getValues('products');
    if (currentProducts.length <= 1) return;
    const updated = currentProducts.filter((_, i) => i !== index);
    setValue('products', updated, { shouldDirty: true });
    if (currentProductIndex >= updated.length) {
        setCurrentProductIndex(Math.max(0, updated.length - 1));
    }
  };

  const watchedValues = watch();
  const debouncedValues = useDebounce(watchedValues, 2000); 

  useEffect(() => {
    const fromProductId = searchParams.get('fromProduct');
    if (fromProductId && catalogProducts.length > 0) {
        const product = catalogProducts.find(p => p.id === fromProductId);
        if (product) setValue('products', [{...product, price: Number(product.price) || 0, id: uuidv4()}], { shouldDirty: true });
    }
  }, [searchParams, catalogProducts, setValue]);
  
  useEffect(() => {
    const duplicateOrderId = searchParams.get('duplicate');
    if (duplicateOrderId && !initialOrder) {
        const sourceOrder = getOrderById(duplicateOrderId);
        if (sourceOrder) form.reset(mapOrderToFormValues({ ...sourceOrder, status: 'In Progress', id: '', chatMessages: [] } as any));
    } 
  }, [searchParams, getOrderById, initialOrder, form, mapOrderToFormValues]);
  
  const isSubmitting = isExternallySubmitting || isManualSaving;

  const performSave = useCallback(async (values: OrderFormValues) => {
    if (!initialOrder || !onSave) return;
    setIsAutoSaving(true);
    const updatedProducts = values.products.map(p => ({
        ...p,
        colors: (p as any).colorAsAttachment ? ["As Attached Picture"] : p.colors,
        dimensions: p.width && p.height && p.depth ? { width: p.width, height: p.height, depth: p.depth } : undefined,
    }));
    const totalIncome = updatedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
    try { await updateOrder({ ...initialOrder, ...values, products: updatedProducts as any, incomeAmount: totalIncome }); } 
    catch (e) {} finally { setIsAutoSaving(false); }
  }, [initialOrder, updateOrder, onSave]);

  useEffect(() => {
    if (isDirty && initialOrder && form.formState.isValid && Object.keys(dirtyFields).length > 0) performSave(debouncedValues);
  }, [debouncedValues, isDirty, initialOrder, form.formState.isValid, dirtyFields, performSave]);

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        const chunks: BlobPart[] = [];
        mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
        mediaRecorderRef.current.onstop = () => {
            setAudioBlob(new Blob(chunks, { type: 'audio/webm' }));
            stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
        setAudioBlob(null);
    } catch (err) {
        toast({ variant: "destructive", title: "Microphone Access Denied", description: "Allow microphone access to record audio." });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addRecordedAudioToOrder = () => {
    if (audioBlob && initialOrder) {
      const file = new File([audioBlob], `voice-memo-${Date.now()}.webm`, { type: 'audio/webm' });
      addAttachment(initialOrder.id, currentProductIndex, file).then(att => {
          if (att) {
              const updated = [...getValues('products')];
              updated[currentProductIndex].attachments = [...(updated[currentProductIndex].attachments || []), att];
              setValue('products', updated, { shouldDirty: true });
          }
      });
      setAudioBlob(null);
    }
  };

  async function handleAddNewCustomer(customerData: any) {
    setNewCustomerSubmitting(true);
    try {
      const id = await addCustomer(customerData);
      form.setValue("customerId", id, { shouldValidate: true, shouldDirty: true });
      setIsCreatingNewCustomer(false);
    } catch (error) {} finally { setNewCustomerSubmitting(false); }
  }
  
  const handleCancelClick = () => isDirty ? setShowCancelDialog(true) : router.back();
  const handleDiscard = () => router.back();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && (initialOrder || isProductCreationMode)) {
      Array.from(event.target.files).forEach(file => {
          if (isProductCreationMode) {
              const att = { fileName: file.name, url: URL.createObjectURL(file), storagePath: '', file: file } as any;
              const updated = [...getValues('products')];
              updated[currentProductIndex].attachments = [...(updated[currentProductIndex].attachments || []), att];
              setValue('products', updated, { shouldDirty: true });
          } else if (initialOrder) {
              addAttachment(initialOrder.id, currentProductIndex, file).then(att => {
                  if (att) {
                      const updated = [...getValues('products')];
                      updated[currentProductIndex].attachments = [...(updated[currentProductIndex].attachments || []), att];
                      setValue('products', updated, { shouldDirty: true });
                  }
              });
          }
      });
    }
  };

  const handleRemoveAttachment = (attachment: OrderAttachment) => {
    if (initialOrder && !isProductCreationMode) removeAttachment(initialOrder.id, currentProductIndex, attachment);
    else {
        const updated = [...getValues('products')];
        updated[currentProductIndex].attachments = (updated[currentProductIndex].attachments || []).filter(att => att.url !== attachment.url);
        setValue('products', updated, { shouldDirty: true });
    }
  };
  
  const currentProduct = watchedProducts ? watchedProducts[currentProductIndex] : null;
  const isColorAsAttachment = currentProduct ? (currentProduct as any).colorAsAttachment : false;
  const woodFinishOptions = colorSettings?.woodFinishes || [];
  const customColorOptions = colorSettings?.customColors || [];
  const productCategories = productSettings?.productCategories || [];
  const availableMaterials = productSettings?.materials || [];
  const selectedCustomerId = form.watch('customerId');
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.location.town && !getValues('location.town')) setValue('location.town', selectedCustomer.location.town, { shouldDirty: true, shouldValidate: true });
  }, [selectedCustomer, setValue, getValues]);
  
  const totalIncome = useMemo(() => watchedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0), [watchedProducts]);
  useEffect(() => { if (form.getValues('incomeAmount') !== totalIncome) setValue('incomeAmount', totalIncome, { shouldDirty: true }); }, [totalIncome, setValue, form]);

  const renderFilePreview = (attachment: OrderAttachment) => {
    const isImage = attachment.fileName?.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = attachment.fileName?.match(/\.(mp3|wav|ogg|webm)$/i);
    return (
        <div key={attachment.url} className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2">
            <div className="flex items-center gap-2 truncate">
                {isImage ? <Image src={attachment.url} alt={attachment.fileName} width={24} height={24} className="h-6 w-6 rounded-sm object-cover" /> : isAudio ? <div className="w-full"><audio controls src={attachment.url} className="h-8" /></div> : <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                {!isAudio && <span className="text-sm truncate">{attachment.fileName}</span>}
            </div>
            <div className="flex items-center flex-shrink-0">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAttachment(attachment)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
        </div>
    )
  }
  
  const handleFormSubmit = async (values: OrderFormValues) => {
    if (!onSave) return;
    setIsManualSaving(true);
    const updatedProducts = values.products.map(p => ({ ...p, colors: (p as any).colorAsAttachment ? ["As Attached Picture"] : p.colors, dimensions: p.width && p.height && p.depth ? { width: Number(p.width), height: Number(p.height), depth: Number(p.depth) } : undefined }));
    const payload = { ...values, products: updatedProducts, incomeAmount: updatedProducts.reduce((sum, p) => sum + (Number(p.price) || 0), 0), status: isProductCreationMode ? undefined : (values.status === 'Pending' ? 'In Progress' : values.status), customerName: customers.find(c => c.id === values.customerId)?.name || "Unknown" };
    onSave(payload as any, !initialOrder).catch(() => setIsManualSaving(false));
  };
  
  const isUploading = Object.keys(uploadProgress).length > 0;
  const allStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];
  const finalSteps = isProductCreationMode ? [3, 4, 5, 6, 7, 8] : STEPS.map(s => s.id);

  return (
    <>
      <div className="mb-8 space-y-4">
        <Progress value={getProgress()} className="w-full" />
        <div className="flex justify-between items-center">
            <p className="text-sm font-medium">{getStepTitle()}</p>
            <div className="text-sm text-muted-foreground">{isAutoSaving ? <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /><span>Auto-saving...</span></div> : !isDirty && initialOrder ? <span>All changes saved.</span> : null}</div>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && !isProductCreationMode && (
              <Card>
                  <CardHeader><CardTitle>Customer & Location</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                      {isCreatingNewCustomer ? <CustomerForm onSubmit={handleAddNewCustomer} isSubmitting={newCustomerSubmitting} submitButtonText="Create and Select" onCancel={() => setIsCreatingNewCustomer(false)} /> : (
                          <>
                              <FormField control={form.control} name="customerId" render={({ field }) => (
                                  <FormItem><FormLabel>Customer</FormLabel><div className="flex items-center gap-2"><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl><SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><Button type="button" variant="outline" size="sm" onClick={()=>setIsCreatingNewCustomer(true)}><UserPlus className="mr-2 h-4 w-4" />New</Button></div><FormMessage /></FormItem>
                              )} />
                              {selectedCustomer && <Card className="bg-muted/50"><CardHeader><CardTitle className="text-base">{selectedCustomer.name}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground space-y-2"><div>{selectedCustomer.phoneNumbers[0]?.number}</div><div>{selectedCustomer.location.town}</div></CardContent></Card>}
                              <FormField control={form.control} name="location.town" render={({ field }) => (
                                  <FormItem><FormLabel>Order Location</FormLabel><FormControl><Input placeholder="Town/City" {...field} /></FormControl><FormMessage /></FormItem>
                              )} />
                          </>
                      )}
                  </CardContent>
              </Card>
          )}
          {initialOrder && currentStep === 2 && !isProductCreationMode && (
              <Card>
                  <CardHeader><CardTitle>Product Setup</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => {
                          const category = productSettings?.productCategories.find(c => c.name === p.category);
                          const iconName = category?.icon || 'Box';
                          return (
                              <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50">
                                  <div className="h-10 w-10 bg-background rounded-md flex items-center justify-center border shrink-0">
                                      <DynamicIcon icon={iconName} className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div className="flex-grow">
                                      <p className="font-semibold">{p.productName || `Product ${i + 1}`}</p>
                                      <p className="text-sm text-muted-foreground">{p.category || 'No Category'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                      <Button variant="outline" size="sm" onClick={() => handleEditProduct(i)}>
                                          <Edit className="mr-2 h-4 w-4" /> Edit
                                      </Button>
                                      {watchedProducts.length > 1 && (
                                          <Button variant="ghost" size="icon" onClick={() => handleRemoveProduct(i)} className="text-destructive">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      )}
                                  </div>
                              </div>
                          )
                      })}
                      <Button type="button" onClick={handleAddAnotherProduct} className="w-full sm:w-auto"><PlusCircleIcon className="mr-2"/> Add Product</Button>
                  </CardContent>
              </Card>
          )}
          {currentStep === 3 && (
              <Card>
                  <CardHeader><CardTitle>Product Category</CardTitle></CardHeader>
                  <CardContent><FormField control={form.control} name={`products.${currentProductIndex}.category`} render={({ field }) => (
                      <FormItem><FormControl><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{productCategories.map(c => { const Icon = (LucideIcons as any)[c.icon] || LucideIcons.Box; return <button key={c.name} type="button" onClick={() => field.onChange(c.name)} className={cn("p-4 border rounded-lg flex flex-col items-center gap-2 hover:bg-accent", field.value === c.name && "bg-primary text-primary-foreground")}><Icon className="h-8 w-8" /><span className="text-sm">{c.name}</span></button> })}</div></FormControl><FormMessage /></FormItem>
                  )} /></CardContent>
              </Card>
          )}
          {currentStep === 4 && (
              <Card>
                  <CardHeader><CardTitle>Product Source</CardTitle></CardHeader>
                  <CardContent><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button type="button" onClick={() => setCurrentStep(5)} className="p-6 border rounded-lg flex flex-col items-center gap-2 hover:bg-accent"><PlusCircleIcon className="h-10 w-10" /><h3>Create New</h3></button><div className="p-6 border rounded-lg"><Input placeholder="Search catalog..." value={catalogSearchTerm} onChange={(e) => setCatalogSearchTerm(e.target.value)} /><ScrollArea className="h-64 mt-4">{filteredCatalogProducts.map(p => <div key={p.id} onClick={() => handleExistingProductSelect(p)} className="p-3 border rounded-md mb-2 cursor-pointer hover:bg-muted">{p.productName}</div>)}</ScrollArea></div></div></CardContent>
              </Card>
          )}
          {currentStep === 5 && (
              <Card>
                  <CardHeader><CardTitle>Details & Attachments</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                    <FormField control={form.control} name={`products.${currentProductIndex}.productName`} render={({ field }) => (
                        <FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name={`products.${currentProductIndex}.description`} render={({ field }) => (
                        <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <div className="grid grid-cols-3 gap-4">
                        {['width', 'height', 'depth'].map(f => <FormField key={f} control={form.control} name={`products.${currentProductIndex}.${f}` as any} render={({ field }) => (
                            <FormItem><FormLabel className="capitalize">{f}</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                        )} />)}
                    </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary" onClick={() => fileInputRef.current?.click()}><UploadCloud className="h-10 w-10 mx-auto mb-2" /><p>Click to upload</p><input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" /></div>
                        {audioBlob ? <SleekAudioPlayer src={audioUrl!} onSave={addRecordedAudioToOrder} onDiscard={() => setAudioBlob(null)} /> : <Button type="button" variant="outline" className="w-full" onClick={isRecording ? stopRecording : startRecording}>{isRecording ? <Square className="mr-2 h-4 w-4"/> : <Mic className="mr-2 h-4 w-4" />} {isRecording ? 'Stop' : 'Record Audio'}</Button>}
                        <div className="space-y-2">{currentProduct?.attachments?.map(renderFilePreview)}</div>
                    </div>
                  </CardContent>
              </Card>
          )}
          {currentStep === 6 && (
              <Card>
                  <CardHeader><CardTitle>Material</CardTitle></CardHeader>
                  <CardContent><FormField control={form.control} name={`products.${currentProductIndex}.material`} render={({ field }) => (
                      <FormItem><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{availableMaterials.map(m => { const Icon = (LucideIcons as any)[m.icon] || LucideIcons.Box; const sel = field.value?.includes(m.name); return <button key={m.name} type="button" onClick={() => field.onChange(sel ? field.value?.filter(n => n !== m.name) : [...(field.value || []), m.name])} className={cn("p-4 border rounded-lg flex flex-col items-center gap-2", sel && "bg-primary text-primary-foreground")}><Icon className="h-8 w-8" />{m.name}</button> })}</div><FormMessage /></FormItem>
                  )} /></CardContent>
              </Card>
          )}
          {currentStep === 7 && (
              <Card>
                  <CardHeader><CardTitle>Color</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                      <FormField control={form.control} name={`products.${currentProductIndex}.colors`} render={() => (
                          <FormItem><div className={cn("space-y-4", isColorAsAttachment && "opacity-50 pointer-events-none")}>
                              <div className="grid grid-cols-4 gap-4">{customColorOptions.map(o => <FormField key={o.name} control={form.control} name={`products.${currentProductIndex}.colors`} render={({ field }) => (
                                  <FormItem><FormControl><Checkbox checked={field.value?.includes(o.name)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), o.name] : field.value?.filter(v => v !== o.name))} className="sr-only" id={`c-${o.name}`} /></FormControl><Label htmlFor={`c-${o.name}`} className="flex flex-col items-center gap-2 cursor-pointer"><div style={{ backgroundColor: o.colorValue }} className={cn("rounded-full h-12 w-12 border", field.value?.includes(o.name) && "ring-2 ring-primary ring-offset-2")} /><span className="text-xs">{o.name}</span></Label></FormItem>
                              )} />)}</div>
                              <div className="grid grid-cols-2 gap-4">{woodFinishOptions.map(o => <FormField key={o.name} control={form.control} name={`products.${currentProductIndex}.colors`} render={({ field }) => (
                                  <FormItem><FormControl><Checkbox checked={field.value?.includes(o.name)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), o.name] : field.value?.filter(v => v !== o.name))} className="sr-only" id={`w-${o.name}`} /></FormControl><Label htmlFor={`w-${o.name}`} className="flex flex-col items-center gap-2 cursor-pointer"><Image src={o.imageUrl} alt={o.name} width={80} height={80} className={cn("rounded-md h-20 w-full object-cover", field.value?.includes(o.name) && "ring-2 ring-primary")} /><span>{o.name}</span></Label></FormItem>
                              )} />)}</div>
                          </div>
                          <FormField control={form.control} name={`products.${currentProductIndex}.colorAsAttachment`} render={({ field }) => (
                              <FormItem className="flex items-center space-x-2 mt-4"><FormControl><Checkbox checked={field.value} onCheckedChange={v => { field.onChange(v); if(v) form.setValue(`products.${currentProductIndex}.colors`, []); }} /></FormControl><FormLabel>Color as attached picture</FormLabel></FormItem>
                          )} />
                          </FormItem>
                      )} />
                  </CardContent>
              </Card>
          )}
          {currentStep === 8 && (
              <Card>
                  <CardHeader><CardTitle>Review</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                      {watchedProducts.map((p, i) => <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg bg-muted/50"><div className="flex-grow"><p className="font-semibold">{p.productName || `Product ${i + 1}`}</p></div><Button variant="outline" size="sm" onClick={() => handleEditProduct(i)}><Edit className="h-4 w-4" /></Button></div>)}
                      {!isProductCreationMode && <Button type="button" variant="outline" onClick={handleAddAnotherProduct}>Add Another</Button>}
                  </CardContent>
              </Card>
          )}
          {currentStep === 9 && !isProductCreationMode && (
              <Card>
                  <CardHeader><CardTitle>Pricing</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                      <FormField control={form.control} name="incomeAmount" render={({ field }) => <FormItem><FormLabel>Total Price</FormLabel><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" /><FormControl><Input type="number" className="pl-8" {...field} readOnly /></FormControl></div></FormItem>} />
                      <div className="space-y-4 border p-4 rounded-md">{watchedProducts.map((p, i) => <FormField key={p.id} control={control} name={`products.${i}.price`} render={({ field }) => <FormItem><FormLabel className="text-xs">{p.productName || `P${i+1}`}</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />)}</div>
                      <FormField control={form.control} name="prepaidAmount" render={({ field }) => <FormItem><FormLabel>Pre-paid</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>} />
                      <FormField control={form.control} name="paymentDetails" render={({ field }) => <FormItem><FormLabel>Details</FormLabel><FormControl><Textarea {...field} /></FormControl></FormItem>} />
                  </CardContent>
              </Card>
          )}
          {currentStep === 10 && !isProductCreationMode && (
              <Card>
                  <CardHeader><CardTitle>Finalize</CardTitle></CardHeader>
                  <CardContent className="space-y-6">
                      <FormField control={form.control} name="status" render={({ field }) => <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent>{allStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></FormItem>} />
                      <FormField control={form.control} name="deadline" render={({ field }) => <FormItem className="flex flex-col"><FormLabel>Deadline</FormLabel><Popover><PopoverTrigger asChild><Button variant="outline">{field.value ? format(field.value, "PPP") : "Pick date"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover></FormItem>} />
                      <FormField control={form.control} name="isUrgent" render={({ field }) => <FormItem className="flex items-center justify-between border p-3 rounded-lg"><FormLabel>Urgent</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />
                  </CardContent>
              </Card>
          )}
          <div className="flex justify-between items-center gap-2 sticky bottom-0 bg-background/95 py-4 z-10">
              <Button variant="outline" type="button" onClick={handleCancelClick} disabled={isPending || isSubmitting}>Cancel</Button>
              <div className="flex items-center gap-2">
                  {currentStep > 1 && <Button variant="outline" type="button" onClick={prevStep} disabled={isPending || isSubmitting}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>}
                  {currentStep < finalSteps[finalSteps.length-1] && ![2, 4, 8].includes(currentStep) && (
                      <Button type="button" onClick={nextStep} disabled={isPending || isSubmitting}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Next <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                  )}
                  {((initialOrder && currentStep === 2) || (currentStep === 8 && !isProductCreationMode)) && (
                      <Button type="button" onClick={() => { startTransition(() => setCurrentStep(9)); }} disabled={isPending || isSubmitting}>
                        Continue <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                  )}
                  {currentStep === finalSteps[finalSteps.length-1] && (
                      <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isSubmitting || isUploading || isPending}>
                        {(isSubmitting || isAutoSaving || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isProductCreationMode ? 'Create Product' : (initialOrder ? submitButtonText : 'Finish Order')}
                      </Button>
                  )}
              </div>
          </div>
        </form>
      </Form>
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>Unsaved changes will be lost.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Stay</AlertDialogCancel><AlertDialogAction onClick={handleDiscard}>Discard</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  )
}
