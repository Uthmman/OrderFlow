
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
import { CalendarIcon, DollarSign, UserPlus, X, Loader2, Paperclip, UploadCloud, File as FileIcon, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order, OrderAttachment } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"
import { useState, useRef } from "react"
import Image from "next/image"
import { woodFinishOptions, customColorOptions } from "@/lib/colors"
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
import { Progress } from "../ui/progress"

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(["Pending", "In Progress", "Designing", "Manufacturing", "Completed", "Shipped", "Cancelled"]),
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
  onSubmit: (data: Omit<Order, 'id' | 'creationDate'>, newFiles: File[]) => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
}


export function OrderForm({ order, onSubmit, submitButtonText = "Create Order", isSubmitting = false }: OrderFormProps) {
  const router = useRouter();
  const { customers, loading: customersLoading, addCustomer } = useCustomers();
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [colorSearch, setColorSearch] = useState("");
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  const [existingAttachments, setExistingAttachments] = useState<OrderAttachment[]>(order?.attachments || []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: order ? {
        ...order,
        deadline: new Date(order.deadline),
        width: order.dimensions?.width,
        height: order.dimensions?.height,
        depth: order.dimensions?.depth,
        colorAsAttachment: order.colors?.includes("As Attached Picture")
    } : {
      isUrgent: false,
      status: "Pending",
      incomeAmount: 0,
      prepaidAmount: 0,
      colors: [],
      colorAsAttachment: false,
    },
  })

  const { formState: { isDirty } } = form;

  function handleFormSubmit(values: OrderFormValues) {
    const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown Customer";
    
    let finalColors = values.colors;
    if (values.colorAsAttachment) {
      finalColors = ["As Attached Picture"];
    }

    const newOrderData: Omit<Order, 'id' | 'creationDate' | 'ownerId'> = {
        ...values,
        attachments: existingAttachments,
        colors: finalColors,
        customerName,
        deadline: values.deadline.toISOString(),
        dimensions: values.width && values.height && values.depth ? {
            width: values.width,
            height: values.height,
            depth: values.depth,
        } : undefined,
        assignedTo: order?.assignedTo || [],
    };
    onSubmit(newOrderData, newFiles);
  }

  const handleAddNewCustomer = async () => {
    if (newCustomerName && newCustomerEmail) {
      try {
        const newCustomerId = await addCustomer({ 
            name: newCustomerName, 
            email: newCustomerEmail,
            phone: '',
            company: '',
            avatarUrl: `https://i.pravatar.cc/150?u=${newCustomerEmail}`,
            orderIds: []
        });
        form.setValue("customerId", newCustomerId, { shouldValidate: true, shouldDirty: true });
        setIsCreatingNewCustomer(false);
        setNewCustomerName("");
        setNewCustomerEmail("");
      } catch (error) {
        console.error("Failed to add new customer", error)
      }
    }
  }
  
  const handleCancelClick = () => {
    if (isDirty || newFiles.length > 0) {
      setShowCancelDialog(true);
    } else {
      router.back();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setNewFiles(prev => [...prev, ...Array.from(event.target.files!)]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  const removeExistingAttachment = (index: number) => {
    setExistingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isColorAsAttachment = form.watch("colorAsAttachment");

  const filteredWoodFinishes = woodFinishOptions.filter(option =>
    option.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  const filteredCustomColors = customColorOptions.filter(option =>
    option.name.toLowerCase().includes(colorSearch.toLowerCase())
  );

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Fill in the main details of the new order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isCreatingNewCustomer ? (
                  <div className="space-y-4 p-4 border rounded-lg relative">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => setIsCreatingNewCustomer(false)}><X className="h-4 w-4" /></Button>
                      <h3 className="font-medium">New Customer</h3>
                      <div className="space-y-2">
                        <Label htmlFor="new-customer-name">Customer Name</Label>
                        <Input id="new-customer-name" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="e.g. John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-customer-email">Customer Email</Label>
                        <Input id="new-customer-email" type="email" value={newCustomerEmail} onChange={(e) => setNewCustomerEmail(e.target.value)} placeholder="e.g. john@example.com"/>
                      </div>
                      <Button type="button" onClick={handleAddNewCustomer} disabled={!newCustomerName || !newCustomerEmail}>Add and Select Customer</Button>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <div className="flex items-center gap-2">
                          <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value} disabled={customersLoading}>
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
                )}
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
                          disabled={isColorAsAttachment}
                        />
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
                    <CardDescription>Upload relevant images or other files.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormItem>
                        <FormControl>
                            <div 
                                className="border-2 border-dashed border-muted rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <UploadCloud className="h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">Click to upload or drag & drop</p>
                                <p className="text-xs text-muted-foreground">PNG, JPG, PDF, etc.</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>
                        </FormControl>
                    </FormItem>

                    {(existingAttachments.length > 0 || newFiles.length > 0) && (
                        <div className="space-y-2">
                             <h4 className="text-sm font-medium">Files to be uploaded:</h4>
                             {existingAttachments.map((file, index) => (
                                <div key={`existing-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm truncate">{file.fileName}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeExistingAttachment(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            {newFiles.map((file, index) => (
                                <div key={`new-${index}`} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <div className="flex items-center gap-2 truncate">
                                        <FileIcon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm truncate">{file.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeNewFile(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>
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
        <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={handleCancelClick}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitButtonText}
            </Button>
        </div>
      </form>
    </Form>
    <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to leave? Your changes will be lost.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Stay on page</AlertDialogCancel>
                <AlertDialogAction onClick={() => router.back()}>
                    Discard changes
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
