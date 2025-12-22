

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
import { Calendar, CalendarIcon, DollarSign, UserPlus, X, Loader2, Paperclip, UploadCloud, File as FileIcon, Trash2, Mic, Square, Download, Play, Pause, ArrowLeft, ArrowRight, User, Phone, MapPin, Ruler } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderAttachment, Customer, OrderStatus, ProductCategory, Material } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback, useTransition } from "react"
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

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  location: z.object({ town: z.string().min(2, "Order location is required.") }),
  productName: z.string().min(3, "Product name must be at least 3 characters."),
  category: z.string().min(1, "Category is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"]),
  colors: z.array(z.string()).optional(),
  material: z.array(z.string()).optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  incomeAmount: z.coerce.number().min(0, "Price cannot be negative."),
  prepaidAmount: z.coerce.number().optional(),
  paymentDetails: z.string().optional(),
  deadline: z.date({ required_error: "A deadline is required." }),
  isUrgent: z.boolean().default(false),
  colorAsAttachment: z.boolean().default(false),
})

type OrderFormValues = z.infer<typeof formSchema>

interface OrderFormProps {
  order?: Order;
  onSave: (data: Omit<Order, 'id' | 'creationDate'>) => Promise<string | undefined>;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

const toDate = (timestamp: any): Date | undefined => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    if (typeof timestamp === 'string') {
        return new Date(timestamp);
    }
    if (timestamp && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000);
    }
    return undefined;
}


const SleekAudioPlayer = ({ src, onSave, onDiscard }: { src: string, onSave: () => void, onDiscard: () => void }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const togglePlay = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="p-2 border rounded-lg space-y-2">
            <div className="flex items-center gap-2">
                <audio ref={audioRef} src={src} onEnded={() => setIsPlaying(false)} hidden />
                <Button type="button" variant="ghost" size="icon" onClick={togglePlay}>
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>
                <div className="text-sm text-muted-foreground">Voice Memo Preview</div>
                <div className="flex-grow" />
                <Button type="button" size="sm" variant="ghost" onClick={onDiscard}>Discard</Button>
                <Button type="button" size="sm" onClick={onSave}>Add Audio to Order</Button>
            </div>
        </div>
    );
};

// Custom hook for debouncing a value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  return debouncedValue;
}

const STEPS = [
  { id: 1, title: 'Customer & Location', fields: ['customerId', 'location'] },
  { id: 2, title: 'Category', fields: ['category'] },
  { id: 3, title: 'Attachments', fields: [] },
  { id: 4, title: 'Product Details & Dimensions', fields: ['productName', 'description', 'width', 'height', 'depth'] },
  { id: 5, title: 'Material', fields: ['material'] },
  { id: 6, title: 'Color', fields: ['colors'] },
  { id: 7, title: 'Scheduling & Pricing', fields: ['status', 'deadline', 'isUrgent', 'incomeAmount', 'prepaidAmount', 'paymentDetails'] }
];

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false }: OrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
  const { productSettings, loading: productsLoading } = useProductSettings();
  const { getOrderById, updateOrder, addAttachment, uploadProgress, removeAttachment } = useOrders();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultValues = {
        productName: '',
        category: '',
        isUrgent: false,
        status: "In Progress" as OrderStatus,
        incomeAmount: 0,
        prepaidAmount: 0,
        colors: [],
        material: [],
        colorAsAttachment: false,
        customerId: '',
        description: '',
        deadline: new Date(),
        location: { town: '' },
    };

    if (!orderToMap) {
        return defaultValues;
    }

    return {
        ...defaultValues,
        ...orderToMap,
        deadline: toDate(orderToMap.deadline) || new Date(),
        location: orderToMap.location || { town: '' },
        width: orderToMap.dimensions?.width,
        height: orderToMap.dimensions?.height,
        depth: orderToMap.dimensions?.depth,
        colorAsAttachment: orderToMap.colors?.includes("As Attached Picture"),
        material: Array.isArray(orderToMap.material) ? orderToMap.material : (orderToMap.material ? [orderToMap.material] : []),
    } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapOrderToFormValues(initialOrder)
  });
  
  const { formState: { isDirty, dirtyFields }, getValues, watch, trigger } = form;

  const nextStep = async () => {
    const fieldsToValidate = STEPS.find(s => s.id === currentStep)?.fields || [];
    const isValid = await trigger(fieldsToValidate as any);

    if (!isValid) return;

    if (!initialOrder && currentStep === 1) {
        setIsManualSaving(true);
        try {
            const values = getValues();
            const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown Customer";
            const draftOrderPayload = {
                ...values,
                customerName,
                status: 'Pending' as const,
                deadline: values.deadline || new Date(),
            };
            const newOrderId = await onSave(draftOrderPayload);
            
            if (newOrderId) {
                 router.replace(`/orders/${newOrderId}/edit`);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not create a draft for the order.' });
                 setIsManualSaving(false);
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not create a draft for the order.' });
             setIsManualSaving(false);
        }
    } else {
        setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };


  // --- Auto-saving Logic ---
  const watchedValues = watch();
  const debouncedValues = useDebounce(watchedValues, 2000); // 2-second debounce delay

  useEffect(() => {
    const duplicateOrderId = searchParams.get('duplicate');
    if (duplicateOrderId && !initialOrder) {
        const sourceOrder = getOrderById(duplicateOrderId);
        if (sourceOrder) {
            const duplicatedOrderData = {
                ...sourceOrder, status: 'In Progress' as const, isUrgent: false, id: '', chatMessages: [],
            }
            form.reset(mapOrderToFormValues(duplicatedOrderData));
        }
    } 
  }, [searchParams, getOrderById, initialOrder, form, mapOrderToFormValues]);
  
  const isSubmitting = isExternallySubmitting || isManualSaving;

  const performSave = useCallback(async (values: OrderFormValues) => {
    if (!initialOrder) return;
    
    setIsAutoSaving(true);
    const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown Customer";
    let finalColors = values.colors;
    if (values.colorAsAttachment) {
      finalColors = ["As Attached Picture"];
    }

    const orderPayload = {
      ...initialOrder,
      ...values,
      colors: finalColors,
      customerName,
      deadline: values.deadline,
      dimensions: values.width && values.height && values.depth ? {
        width: values.width,
        height: values.height,
        depth: values.depth,
      } : undefined,
    } as Order;

    try {
        await updateOrder(orderPayload);
        form.reset(values); // Resets dirty state after successful save
    } catch (e) {
        console.error("Auto-save failed:", e);
    } finally {
        setIsAutoSaving(false);
    }
  }, [initialOrder, customers, updateOrder, form]);

  // Auto-save effect
  useEffect(() => {
    const isFormValid = form.formState.isValid;
    if (isDirty && initialOrder && isFormValid && Object.keys(dirtyFields).length > 0) {
      performSave(getValues());
    }
  }, [debouncedValues, isDirty, initialOrder, dirtyFields, getValues, form.formState.isValid, performSave]);


 const requestMicPermission = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    } catch (err) {
        console.error("Microphone access denied:", err);
        toast({
            variant: "destructive",
            title: "Microphone Access Denied",
            description: "To record audio, you must allow microphone access in your browser settings."
        });
        return null;
    }
  };

  const startRecording = async () => {
    let stream: MediaStream | null;
    // We only request permission when the user clicks the button.
    stream = await requestMicPermission();
    
    if (!stream) return;
    
    const mimeType = 'audio/webm';
     if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.error(`${mimeType} is not supported on this browser.`);
        toast({
            variant: "destructive",
            title: "Unsupported Format",
            description: "Your browser does not support WebM recording. Please try a different browser.",
        });
        return;
    }

    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });
    const chunks: BlobPart[] = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
    };
    mediaRecorderRef.current.start();
    setIsRecording(true);
    setAudioBlob(null);
  };


  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addRecordedAudioToOrder = () => {
    if (audioBlob && initialOrder) {
      const audioFile = new File([audioBlob], `voice-memo-${new Date().toISOString()}.webm`, { type: 'audio/webm' });
      startTransition(() => {
        addAttachment(initialOrder.id, audioFile);
      });
      setAudioBlob(null);
    }
  };

  const discardAudio = () => {
    setAudioBlob(null);
  };

  async function handleAddNewCustomer(customerData: Omit<Customer, "id" | "ownerId" | "orderIds" | "reviews">) {
    setNewCustomerSubmitting(true);
    try {
      const newCustomerId = await addCustomer(customerData);
      form.setValue("customerId", newCustomerId, { shouldValidate: true, shouldDirty: true });
      toast({
        title: "Customer Created",
        description: `${customerData.name} has been successfully added.`,
      });
      setIsCreatingNewCustomer(false);
    } catch (error) {
      console.error("Failed to add new customer", error)
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: "There was a problem creating the customer.",
      });
    } finally {
        setNewCustomerSubmitting(false);
    }
  }
  
  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelDialog(true);
    } else {
      router.back();
    }
  };

  const handleDiscard = () => {
    router.back();
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && initialOrder) {
      const files = Array.from(event.target.files);
      files.forEach(file => {
        startTransition(() => {
            addAttachment(initialOrder.id, file);
        });
      })
    }
  };

  const handleRemoveAttachment = (attachment: OrderAttachment) => {
    if (initialOrder) {
        removeAttachment(initialOrder.id, attachment);
    }
  };

  const isColorAsAttachment = form.watch("colorAsAttachment");
  const woodFinishOptions = colorSettings?.woodFinishes || [];
  const customColorOptions = colorSettings?.customColors || [];
  const productCategories = productSettings?.productCategories || [];
  const availableMaterials = productSettings?.materials || [];
  const selectedCustomerId = form.watch('customerId');
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);


  const filteredWoodFinishes = woodFinishOptions.filter(option =>
    option.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const filteredCustomColors = customColorOptions.filter(option =>
    option.name.toLowerCase().includes(colorSearch.toLowerCase())
  );
  
  const renderFilePreview = (attachment: OrderAttachment) => {
    const isImage = attachment.fileName.match(/\.(jpeg|jpg|gif|png|webp)$/i);
    const isAudio = attachment.fileName.match(/\.(mp3|wav|ogg|webm)$/i);

    return (
        <div key={attachment.storagePath} className="flex items-center justify-between p-2 bg-muted/50 rounded-md gap-2">
            <div className="flex items-center gap-2 truncate">
                {isImage ? (
                    <Image src={attachment.url} alt={attachment.fileName} width={24} height={24} className="h-6 w-6 rounded-sm object-cover" />
                ) : isAudio ? (
                     <div className="w-full"><audio controls src={attachment.url} className="w-full h-8" /></div>
                ) : (
                    <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                {!isAudio && <span className="text-sm truncate">{attachment.fileName}</span>}
            </div>
            <div className="flex items-center flex-shrink-0">
                 {!isAudio && (
                    <a href={attachment.url} download={attachment.fileName} target="_blank" rel="noopener noreferrer">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-4 w-4" />
                        </Button>
                    </a>
                )}
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAttachment(attachment)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        </div>
    )
  }
  
 const handleFormSubmit = async (values: OrderFormValues) => {
    setIsManualSaving(true);
    try {
      const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown Customer";
      let finalColors = values.colors;
      if (values.colorAsAttachment) {
        finalColors = ["As Attached Picture"];
      }

      const orderPayload = {
        ...(initialOrder || {}),
        ...values,
        status: values.status,
        colors: finalColors,
        customerName,
        deadline: values.deadline,
        dimensions: values.width && values.height && values.depth ? {
          width: values.width,
          height: values.height,
          depth: values.depth,
        } : undefined,
      };

      await onSave(orderPayload as Omit<Order, 'creationDate' | 'id'>);
      form.reset(values); // Mark form as not dirty
      if (initialOrder) {
        // If editing, show toast
        toast({
            title: "Order Updated",
            description: "Your changes have been saved."
        });
      }
    } catch (error) {
        // onSave should handle its own errors/toasts
    } finally {
      setIsManualSaving(false);
    }
  };
  
  const isUploading = Object.keys(uploadProgress).length > 0;

  const allStatuses: OrderStatus[] = ["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Painting", "Completed", "Shipped", "Cancelled"];
  const createOrderStatuses = allStatuses.filter(s => s !== "Pending");


  return (
    <>
    <div className="mb-8 space-y-4">
        <Progress value={(currentStep / STEPS.length) * 100} className="w-full" />
        <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].title}</p>
            <div className="text-sm text-muted-foreground">
                {isAutoSaving ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Auto-saving...</span>
                    </div>
                ) : !isDirty && initialOrder ? (
                    <span>All changes saved.</span>
                ): null}
            </div>
        </div>
    </div>
    <Form {...form}>
      <form onSubmit={e => e.preventDefault()} className="space-y-8">
        
        {currentStep === 1 && (
            <Card>
                <CardHeader>
                    <CardTitle>Customer & Location</CardTitle>
                    <CardDescription>
                        Select a customer and specify the location for this order.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isCreatingNewCustomer ? (
                         <div>
                            <div className="flex items-center justify-between mb-4">
                               <h3 className="text-lg font-medium">Create New Customer</h3>
                               <Button type="button" variant="ghost" size="icon" onClick={() => setIsCreatingNewCustomer(false)}><X className="h-4 w-4" /></Button>
                           </div>
                           <CustomerForm 
                               onSubmit={handleAddNewCustomer} 
                               isSubmitting={newCustomerSubmitting}
                               submitButtonText="Create and Select"
                               onCancel={() => setIsCreatingNewCustomer(false)}
                           />
                       </div>
                    ) : (
                        <>
                            <FormField
                                control={form.control}
                                name="customerId"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Customer</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <Select onValueChange={field.onChange} value={field.value} disabled={customersLoading}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Select a customer" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {customers.map(customer => (
                                            <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <Button type="button" variant="outline" size="sm" onClick={() => setIsCreatingNewCustomer(true)}>
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        New
                                        </Button>
                                    </div>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {selectedCustomer && (
                                <Card className="bg-muted/50">
                                    <CardHeader>
                                        <CardTitle className="text-base">{selectedCustomer.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground space-y-2">
                                        <div className="flex items-center gap-2"><Phone/> {selectedCustomer.phoneNumbers.find(p => p.type === 'Mobile')?.number}</div>
                                        <div className="flex items-center gap-2"><MapPin/> {selectedCustomer.location.town}</div>
                                    </CardContent>
                                </Card>
                            )}

                            <FormField
                                control={form.control}
                                name="location.town"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Order Location</FormLabel>
                                     <FormControl>
                                        <Input placeholder="Enter a town or city for this order" {...field} />
                                    </FormControl>
                                    <FormDescription>Where the final product will be delivered or installed.</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </>
                    )}
                </CardContent>
            </Card>
        )}

        {currentStep === 2 && (
             <Card>
                <CardHeader>
                    <CardTitle>Product Category</CardTitle>
                    <CardDescription>
                        Choose the type of product for this order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {productCategories.map((cat) => {
                                            const IconComponent = (LucideIcons as any)[cat.icon] || LucideIcons.Box;
                                            const isSelected = field.value === cat.name;
                                            return (
                                                <button
                                                    key={cat.name}
                                                    type="button"
                                                    onClick={() => field.onChange(cat.name)}
                                                    className={cn("p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors",
                                                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                                    )}
                                                >
                                                    <IconComponent className="h-8 w-8" />
                                                    <span className="font-medium text-sm text-center">{cat.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </FormControl>
                                <FormMessage className="pt-4" />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>
        )}
        
        {currentStep === 3 && (
            <Card>
                <CardHeader>
                    <CardTitle>Attachments</CardTitle>
                    <CardDescription>Upload relevant images, documents, or record a voice memo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!initialOrder ? (
                        <Alert variant="default">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <AlertTitle>Action Required</AlertTitle>
                            <AlertDescription>Please complete the customer step to enable attachments.</AlertDescription>
                        </Alert>
                    ) : (
                        <>
                        <div className="space-y-4">
                            <FormItem>
                                <FormControl>
                                    <div 
                                        className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                                        <p className="text-muted-foreground">Click to upload or drag & drop files</p>
                                        <p className="text-xs text-muted-foreground">PNG, JPG, PDF, etc.</p>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            onChange={handleFileChange}
                                            className="hidden"
                                            disabled={!initialOrder}
                                        />
                                    </div>
                                </FormControl>
                            </FormItem>
                            <div className="relative">
                                <Separator />
                                <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-card px-2 text-xs text-muted-foreground">OR</span>
                            </div>
                            {audioBlob && audioUrl ? (
                                <SleekAudioPlayer src={audioUrl} onSave={addRecordedAudioToOrder} onDiscard={discardAudio} />
                            ) : (
                                <Button 
                                    type="button" 
                                    variant={isRecording ? "destructive" : "outline"} 
                                    className="w-full"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={!initialOrder}
                                >
                                    {isRecording ? <Square className="mr-2"/> : <Mic className="mr-2" />}
                                    {isRecording ? 'Stop Recording' : 'Record Audio Memo'}
                                </Button>
                            )}
                        </div>
                        
                        {(initialOrder?.attachments && initialOrder.attachments.length > 0) && (
                            <div className="space-y-2 pt-4">
                                <h4 className="text-sm font-medium">Current Attachments:</h4>
                                <div className="space-y-2">
                                    {initialOrder.attachments.map((file) => renderFilePreview(file))}
                                </div>
                            </div>
                        )}
                        
                        {(isUploading || isPending) && (
                        <div className="space-y-2 pt-4">
                            <h4 className="text-sm font-medium">Uploading...</h4>
                            {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                <div key={fileName} className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="truncate">{fileName}</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2" />
                                </div>
                            ))}
                        </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>
        )}

        {currentStep === 4 && (
            <Card>
                <CardHeader>
                <CardTitle>Product Details & Dimensions</CardTitle>
                <CardDescription>
                    Fill in the main details and specifications of the order.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Product Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Custom Oak Dining Table" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Detailed Description</FormLabel>
                        <FormControl>
                        <Textarea
                            placeholder="Provide a detailed description of the order requirements..."
                            rows={4}
                            {...field}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                <div className="space-y-2">
                    <Label>Dimensions (cm)</Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                        control={form.control}
                        name="width"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Width</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="W" {...field} value={field.value || ''} />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Height</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="H" {...field} value={field.value || ''} />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="depth"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Depth</FormLabel>
                            <FormControl>
                                <Input type="number" placeholder="D" {...field} value={field.value || ''} />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    </div>
                </div>

                </CardContent>
            </Card>
        )}
        
        {currentStep === 5 && (
             <Card>
                <CardHeader>
                    <CardTitle>Material</CardTitle>
                    <CardDescription>
                        Choose one or more materials for this order.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <FormField
                        control={form.control}
                        name="material"
                        render={({ field }) => (
                            <FormItem>
                                <FormControl>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {availableMaterials.map((mat) => {
                                            const IconComponent = (LucideIcons as any)[mat.icon] || LucideIcons.Box;
                                            const isSelected = field.value?.includes(mat.name);
                                            return (
                                                <button
                                                    key={mat.name}
                                                    type="button"
                                                    onClick={() => {
                                                        const newValue = isSelected
                                                            ? field.value?.filter(name => name !== mat.name)
                                                            : [...(field.value || []), mat.name];
                                                        field.onChange(newValue);
                                                    }}
                                                    className={cn("p-4 border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-accent hover:text-accent-foreground transition-colors",
                                                        isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
                                                    )}
                                                >
                                                    <IconComponent className="h-8 w-8" />
                                                    <span className="font-medium text-sm text-center">{mat.name}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </FormControl>
                                <FormMessage className="pt-4" />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>
        )}

        {currentStep === 6 && (
             <Card>
                <CardHeader>
                    <CardTitle>Color</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                    control={form.control}
                    name="colors"
                    render={() => (
                        <FormItem>
                        <div className="flex items-center space-x-2">
                            <Input
                            placeholder="Search colors..."
                            value={colorSearch}
                            onChange={(e) => setColorSearch(e.target.value)}
                            className="max-w-xs"
                            disabled={isColorAsAttachment || colorsLoading}
                            />
                            {colorsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        </div>
                        
                        <div className={cn("space-y-4 pt-4", isColorAsAttachment && "opacity-50 pointer-events-none")}>
                             <div>
                                <h4 className="font-medium text-sm">Custom Colors</h4>
                                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 mt-2">
                                    {filteredCustomColors.map((option) => (
                                        <FormField
                                            key={option.name}
                                            control={form.control}
                                            name="colors"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormControl>
                                                    <Checkbox
                                                    checked={field.value?.includes(option.name)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), option.name])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== option.name
                                                            )
                                                            )
                                                    }}
                                                    className="sr-only"
                                                    id={`color-${option.name}`}
                                                    />
                                                </FormControl>
                                                <Label htmlFor={`color-${option.name}`} className="flex flex-col items-center gap-2 cursor-pointer w-full group">
                                                    <div style={{ backgroundColor: option.colorValue }} className={cn("rounded-full h-16 w-16 border group-hover:ring-2 group-hover:ring-primary group-hover:ring-offset-2", field.value?.includes(option.name) && "ring-2 ring-primary ring-offset-2")} />
                                                    <span className="text-xs text-center truncate w-full font-medium">{option.name}</span>
                                                </Label>
                                                </FormItem>
                                            )}
                                            />
                                    ))}
                                </div>
                            </div>

                            <Separator className="my-6" />

                            <div>
                                <h4 className="font-medium text-sm pt-2">Custom Finishes</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-2">
                                    {filteredWoodFinishes.map((option) => (
                                        <FormField
                                            key={option.name}
                                            control={form.control}
                                            name="colors"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormControl>
                                                    <Checkbox
                                                    checked={field.value?.includes(option.name)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                        ? field.onChange([...(field.value || []), option.name])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== option.name
                                                            )
                                                            )
                                                    }}
                                                    className="sr-only"
                                                    id={`wood-${option.name}`}
                                                    />
                                                </FormControl>
                                                <Label htmlFor={`wood-${option.name}`} className="flex flex-col items-center gap-2 cursor-pointer w-full group">
                                                    <Image 
                                                        src={option.imageUrl} 
                                                        alt={option.name} 
                                                        width={120} 
                                                        height={120}
                                                        className={cn("rounded-md h-28 w-full object-cover border-2 border-transparent group-hover:border-primary", field.value?.includes(option.name) && "ring-2 ring-primary ring-offset-2 border-primary")}
                                                    />
                                                    <span className="text-xs text-center truncate w-full font-medium">{option.name}</span>
                                                </Label>
                                                </FormItem>
                                            )}
                                            />
                                    ))}
                                </div>
                            </div>
                        </div>

                         <FormField
                            control={form.control}
                            name="colorAsAttachment"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-6">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                        field.onChange(checked);
                                        if (checked) {
                                            form.setValue("colors", []);
                                        }
                                    }}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                    Color as Attached Picture
                                    </FormLabel>
                                </div>
                                </FormItem>
                            )}
                            />

                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </CardContent>
             </Card>
        )}

        {currentStep === 7 && (
             <div className="space-y-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Scheduling & Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Order Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a status" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {(initialOrder ? allStatuses : createOrderStatuses).map(status => (
                                            <SelectItem key={status} value={status}>{status}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                            />
                        <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                            <FormLabel>Deadline</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                <FormControl>
                                    <Button
                                    type="button"
                                    variant={"outline"}
                                    className={cn(
                                        "pl-3 text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    {field.value ? (
                                        format(field.value, "PPP")
                                    ) : (
                                        <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    disabled={(date) =>
                                    date < new Date(new Date().setHours(0,0,0,0))
                                    }
                                    initialFocus
                                />
                                </PopoverContent>
                            </Popover>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="isUrgent"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Urgent Order</FormLabel>
                                <FormDescription>
                                Prioritize this order in the queue.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Pricing & Payment</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField
                        control={form.control}
                        name="incomeAmount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Income Amount</FormLabel>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl>
                                    <Input type="number" placeholder="0.00" className="pl-8" {...field} />
                                </FormControl>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="prepaidAmount"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Pre-paid Amount</FormLabel>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <FormControl>
                                    <Input type="number" placeholder="0.00" className="pl-8" {...field} value={field.value || ''} />
                                </FormControl>
                            </div>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                        <FormField
                        control={form.control}
                        name="paymentDetails"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Payment Details</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., 50% upfront, Paid via Stripe #..."
                                {...field}
                                value={field.value || ''}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </CardContent>
                </Card>
            </div>
        )}

         <div className="flex justify-between items-center gap-2 sticky bottom-0 bg-background/95 py-4">
             <Button variant="outline" type="button" onClick={handleCancelClick} disabled={isSubmitting}>Cancel</Button>
             <div className="flex items-center gap-2">
                {currentStep > 1 && (
                    <Button variant="outline" type="button" onClick={prevStep}>
                        <ArrowLeft className="mr-2" /> Back
                    </Button>
                )}
                {currentStep < STEPS.length && (
                    <Button type="button" onClick={nextStep} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Next <ArrowRight className="ml-2" />
                    </Button>
                )}
                {currentStep === STEPS.length && (
                    <Button type="button" onClick={form.handleSubmit(handleFormSubmit)} disabled={isSubmitting || isUploading || isAutoSaving}>
                        {(isSubmitting || isAutoSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {submitButtonText}
                    </Button>
                )}
             </div>
        </div>
      </form>
    </Form>
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    Any unsaved changes will be lost.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Stay on page</AlertDialogCancel>
                <AlertDialogAction onClick={handleDiscard}>
                    Discard changes
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

    