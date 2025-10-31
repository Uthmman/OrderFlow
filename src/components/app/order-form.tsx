

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
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, DollarSign, UserPlus, X, Loader2, Paperclip, UploadCloud, File as FileIcon, Trash2, Mic, Square, Download, Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderAttachment, Customer, OrderStatus } from "@/lib/types"
import { useRouter, useSearchParams } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef, useEffect, useCallback, useTransition } from "react"
import Image from "next/image"
import { Checkbox } from "../ui/checkbox"
import { Label } from "../ui/label"
import { Separator } from "../ui/separator"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "../ui/carousel"
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

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(["Pending", "In Progress", "Designing", "Design Ready", "Manufacturing", "Completed", "Shipped", "Cancelled"]),
  colors: z.array(z.string()).optional(),
  material: z.string().optional(),
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
  onSave: (data: Omit<Order, 'id' | 'creationDate'>) => Promise<any>;
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

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false }: OrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const { settings: colorSettings, loading: colorsLoading } = useColorSettings();
  const { getOrderById, updateOrder, addAttachment, uploadProgress, removeAttachment } = useOrders();
  
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerSubmitting, setNewCustomerSubmitting] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : null;
  
  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    if (!orderToMap) {
        return {
            isUrgent: false,
            status: "Pending",
            incomeAmount: 0,
            prepaidAmount: 0,
            colors: [],
            colorAsAttachment: false,
            customerId: '',
            description: '',
            deadline: new Date(),
        }
    }
    return {
        ...orderToMap,
        deadline: toDate(orderToMap.deadline) || new Date(),
        width: orderToMap.dimensions?.width,
        height: orderToMap.dimensions?.height,
        depth: orderToMap.dimensions?.depth,
        colorAsAttachment: orderToMap.colors?.includes("As Attached Picture"),
    } as OrderFormValues;
  }, []);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: mapOrderToFormValues(initialOrder)
  });
  
  const { formState: { isDirty, dirtyFields }, getValues, watch } = form;

  // --- Auto-saving Logic ---
  const watchedValues = watch();
  const debouncedValues = useDebounce(watchedValues, 2000); // 2-second debounce delay

  useEffect(() => {
    const duplicateOrderId = searchParams.get('duplicate');
    if (duplicateOrderId && !initialOrder) {
        const sourceOrder = getOrderById(duplicateOrderId);
        if (sourceOrder) {
            const duplicatedOrderData = {
                ...sourceOrder, status: 'Pending' as const, isUrgent: false, id: '', chatMessages: [],
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
        setHasMicPermission(true);
        return stream;
    } catch (err) {
        console.error("Microphone access denied:", err);
        setHasMicPermission(false);
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

    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
    const chunks: BlobPart[] = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
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
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Download className="h-4 w-4" />
                        </Button>
                    </a>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveAttachment(attachment)}>
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
    } catch (error) {
        // onSave should handle its own errors/toasts
    } finally {
      setIsManualSaving(false);
    }
  };
  
  const isUploading = Object.keys(uploadProgress).length > 0;

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {isCreatingNewCustomer ? (
               <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Create New Customer</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsCreatingNewCustomer(false)}><X className="h-4 w-4" /></Button>
                  </div>
                   <CardDescription>
                      Fill in the details for the new customer. They will be automatically selected.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                  <CustomerForm 
                    onSubmit={handleAddNewCustomer} 
                    isSubmitting={newCustomerSubmitting}
                    submitButtonText="Create and Select Customer"
                   />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                  <CardDescription>
                    Fill in the main details of the new order.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide a detailed description of the order requirements..."
                            rows={6}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
                 <CardDescription>
                  Provide product specifications like material, color, and dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Oak Wood, Canvas" {...field} value={field.value || ''}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
                 
                <FormField
                  control={form.control}
                  name="colors"
                  render={() => (
                    <FormItem>
                      <div className="space-y-2">
                        <FormLabel>Color</FormLabel>
                        <FormDescription>Select one or more colors, search, or specify color via attachment.</FormDescription>
                      </div>

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
                      
                       <FormField
                        control={form.control}
                        name="colorAsAttachment"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
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
                                <FormDescription>
                                Select this if the color specifications are provided in an image attachment.
                                </FormDescription>
                            </div>
                            </FormItem>
                        )}
                        />


                      <div className={cn("space-y-4 pt-4", isColorAsAttachment && "opacity-50 pointer-events-none")}>
                          <div>
                            <h4 className="font-medium text-sm pt-2">Wood Finishes</h4>
                             <Carousel opts={{ align: "start", dragFree: true }} className="w-full mt-2">
                              <CarouselContent className="-ml-2">
                                {filteredWoodFinishes.map((option) => (
                                  <CarouselItem key={option.name} className="basis-1/4 md:basis-1/5 lg:basis-1/6 pl-2">
                                     <FormField
                                        control={form.control}
                                        name="colors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-2 space-y-0">
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
                                                id={option.name}
                                                />
                                            </FormControl>
                                            <Label htmlFor={option.name} className="flex flex-col items-center gap-2 cursor-pointer w-full">
                                                <Image 
                                                    src={option.imageUrl} 
                                                    alt={option.name} 
                                                    width={80} 
                                                    height={80}
                                                    className={cn("rounded-md h-20 w-full object-cover", field.value?.includes(option.name) && "ring-2 ring-primary ring-offset-2")}
                                                />
                                                <span className="text-xs text-center truncate w-full">{option.name}</span>
                                            </Label>
                                            </FormItem>
                                        )}
                                        />
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              <CarouselPrevious />
                              <CarouselNext />
                            </Carousel>
                          </div>

                          <Separator className="my-6" />

                          <div>
                            <h4 className="font-medium text-sm">Custom Colors</h4>
                             <Carousel opts={{ align: "start", dragFree: true }} className="w-full mt-2">
                              <CarouselContent className="-ml-2">
                                {filteredCustomColors.map((option) => (
                                  <CarouselItem key={option.name} className="basis-1/4 md:basis-1/5 lg:basis-1/6 pl-2">
                                      <FormField
                                        control={form.control}
                                        name="colors"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center space-x-2 space-y-0">
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
                                                id={option.name}
                                                />
                                            </FormControl>
                                            <Label htmlFor={option.name} className="flex flex-col items-center gap-2 cursor-pointer w-full">
                                                <div style={{ backgroundColor: option.colorValue }} className={cn("rounded-md h-20 w-full", field.value?.includes(option.name) && "ring-2 ring-primary ring-offset-2")} />
                                                <span className="text-xs text-center truncate w-full">{option.name}</span>
                                            </Label>
                                            </FormItem>
                                        )}
                                        />
                                  </CarouselItem>
                                ))}
                              </CarouselContent>
                              <CarouselPrevious />
                              <CarouselNext />
                            </Carousel>
                          </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 
                 <FormLabel>Dimensions (cm)</FormLabel>
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
              </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Attachments</CardTitle>
                    <CardDescription>Upload relevant images, documents, or record a voice memo.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!initialOrder ? (
                        <Alert variant="destructive">
                           <AlertTitle>Save Required</AlertTitle>
                           <AlertDescription>Please save the order first to enable file attachments.</AlertDescription>
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

          </div>

          <div className="space-y-8">
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
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Designing">Designing</SelectItem>
                                <SelectItem value="Design Ready">Design Ready</SelectItem>
                                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                                <SelectItem value="Shipped">Shipped</SelectItem>
                                <SelectItem value="Cancelled">Cancelled</SelectItem>
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
          </div>
        </div>
        <div className="flex justify-end items-center gap-2 sticky bottom-0 bg-background/95 py-4">
             <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
                {isAutoSaving ? (
                     <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Auto-saving...</span>
                    </>
                ) : !isDirty ? (
                    <span>All changes saved.</span>
                ): null}
             </div>
             <Button variant="outline" type="button" onClick={handleCancelClick} disabled={isSubmitting}>Cancel</Button>
             <Button type="submit" disabled={isSubmitting || isUploading || isAutoSaving}>
                 {(isSubmitting || isAutoSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {submitButtonText}
             </Button>
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
