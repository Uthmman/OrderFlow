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
import { CalendarIcon, Image as ImageIcon, Mic, DollarSign } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Switch } from "@/components/ui/switch"
import { Order } from "@/lib/types"
import { useRouter } from "next/navigation"
import { useCustomers } from "@/hooks/use-customers"

const formSchema = z.object({
  customerId: z.string().min(1, "Customer is required."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  status: z.enum(["Pending", "In Progress", "Designing", "Manufacturing", "Completed", "Shipped", "Cancelled"]),
  color: z.string().optional(),
  material: z.string().optional(),
  width: z.coerce.number().optional(),
  height: z.coerce.number().optional(),
  depth: z.coerce.number().optional(),
  incomeAmount: z.coerce.number().min(0, "Price cannot be negative."),
  prepaidAmount: z.coerce.number().optional(),
  paymentDetails: z.string().optional(),
  deadline: z.date({ required_error: "A deadline is required." }),
  isUrgent: z.boolean().default(false),
})

type OrderFormValues = z.infer<typeof formSchema>

interface OrderFormProps {
  order?: Order;
  onSubmit: (data: Omit<Order, 'id' | 'creationDate'>) => void;
  submitButtonText?: string;
}


export function OrderForm({ order, onSubmit, submitButtonText = "Create Order" }: OrderFormProps) {
  const router = useRouter();
  const { customers, loading: customersLoading } = useCustomers();
  
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: order ? {
        ...order,
        deadline: new Date(order.deadline),
        width: order.dimensions?.width,
        height: order.dimensions?.height,
        depth: order.dimensions?.depth,
    } : {
      isUrgent: false,
      status: "Pending",
      incomeAmount: 0,
      prepaidAmount: 0,
    },
  })

  function handleFormSubmit(values: OrderFormValues) {
    const customerName = customers.find(c => c.id === values.customerId)?.name || "Unknown Customer";
    
    const newOrderData: Omit<Order, 'id' | 'creationDate'> = {
        ...values,
        customerName,
        deadline: values.deadline.toISOString(),
        dimensions: values.width && values.height && values.depth ? {
            width: values.width,
            height: values.height,
            depth: values.depth,
        } : undefined,
        assignedTo: order?.assignedTo || [],
    };
    onSubmit(newOrderData);
  }

  return (
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
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={customersLoading}>
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

            <Card>
              <CardHeader>
                <CardTitle>Specifications</CardTitle>
                 <CardDescription>
                  Provide product specifications like material, color, and dimensions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                    <FormField
                      control={form.control}
                      name="color"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <div className="flex items-center gap-2">
                             <Input type="color" className="w-12 h-10 p-1" {...field} value={field.value || '#000000'} />
                             <Input placeholder="e.g., #FF0000 or 'Cherry Red'" {...field} className="w-auto flex-1" value={field.value || ''} />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                 </div>
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
                    <CardDescription>Upload relevant images or voice notes.</CardDescription>
                 </CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormItem>
                        <FormLabel>Image Attachments</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2 p-2 border rounded-md">
                                <ImageIcon className="text-muted-foreground" />
                                <span className="text-sm text-muted-foreground flex-1">Click to upload or drag & drop</span>
                                <Button type="button" variant="outline" size="sm">Upload</Button>
                            </div>
                        </FormControl>
                    </FormItem>
                     <FormItem>
                        <FormLabel>Voice Memos</FormLabel>
                        <FormControl>
                            <div className="flex items-center gap-2 p-2 border rounded-md">
                                <Mic className="text-muted-foreground" />
                                <span className="text-sm text-muted-foreground flex-1">Click to upload or drag & drop</span>
                                <Button type="button" variant="outline" size="sm">Upload</Button>
                            </div>
                        </FormControl>
                    </FormItem>
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
            <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
            <Button type="submit">{submitButtonText}</Button>
        </div>
      </form>
    </Form>
  )
}
