
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
import { Banknote, UserPlus, Loader2, UploadCloud, File as FileIcon, Trash2, ArrowLeft, ArrowRight, PlusCircle as PlusCircleIcon, Receipt, CheckCircle, Boxes, Palette, Ruler, CreditCard, Calendar as CalendarIcon, Phone, Search, PlusCircle, User, Plus, Minus, ImageIcon, CheckCircle2, ListChecks, Package, X, FlaskConical, Library } from "lucide-react"
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
import { Timestamp, serverTimestamp } from "firebase/firestore"
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
  imageUrl: z.string().optional(),
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

const VAT_RATE = 0.15;
const STEPS = [
  { id: 1, title: 'Customer & Location' },
  { id: 2, title: 'Product Setup' },
  { id: 3, title: 'Category' },
  { id: 4, title: 'Source' },
  { id: 5, title: 'Details' },
  { id: 6, title: 'Material' },
  { id: 7, title: 'Color' },
  { id: 8, title: 'Review' },
  { id: 9, title: 'Pricing & Receipt' },
  { id: 10, title: 'Finalize' }
];

const toDate = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp?.seconds) return new Date(timestamp.seconds * 1000);
    return undefined;
}

export function OrderForm({ order: initialOrder, onSave, submitButtonText = "Create Order", isSubmitting: isExternallySubmitting = false }: { order?: Order; onSave: any; submitButtonText?: string; isSubmitting?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customers } = useCustomers();
  const { products: catalogProducts } = useProducts();
  const { settings: colorSettings } = useColorSettings();
  const { productSettings } = useProductSettings();
  const { uploadFile } = useOrders();
  
  const [currentProductIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState(searchParams.get('step') ? parseInt(searchParams.get('step')!) : 1);
  const [activeUploads, setActiveUploads] = useState<{ id: string; name: string; progressKey: string }[]>([]);

  const mapOrderToFormValues = useCallback((orderToMap?: Order): OrderFormValues => {
    const defaultProduct: Product = { id: uuidv4(), productName: '', category: '', description: '', billOfMaterials: '', attachments: [], designAttachments: [], colors: [], material: [], price: 0, quantity: 1, bomItems: [], prepaidAmount: 0 };
    if (!orderToMap) return { products: [defaultProduct], isUrgent: false, status: "Pending", incomeAmount: 0, customerId: '', creationDate: new Date(), deadline: new Date(), location: { town: '' }, withReceipt: false, vatAmount: 0, totalWithVat: 0, paymentMethod: 'Cash', isSample: false, prepaidAmount: 0 } as OrderFormValues;
    return { ...orderToMap, creationDate: toDate(orderToMap.creationDate) || new Date(), deadline: toDate(orderToMap.deadline) || new Date(), products: orderToMap.products || [defaultProduct] } as any;
  }, []);

  const form = useForm<OrderFormValues>({ resolver: zodResolver(formSchema), defaultValues: mapOrderToFormValues(initialOrder) });
  const { setValue, getValues, watch } = form;
  const watchedProducts = watch("products");
  const watchedWithReceipt = watch("withReceipt");
  const watchedIsSample = watch("isSample");

  const totalIncomeValue = watchedProducts.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.quantity) || 1), 0);
  
  useEffect(() => { 
    setValue('incomeAmount', totalIncomeValue);
    if (watchedWithReceipt) {
        const vat = totalIncomeValue * VAT_RATE;
        setValue("vatAmount", Math.round(vat));
        setValue("totalWithVat", Math.round(totalIncomeValue + vat));
    } else {
        setValue("vatAmount", 0);
        setValue("totalWithVat", totalIncomeValue);
    }
  }, [totalIncomeValue, watchedWithReceipt, setValue]);

  const nextStep = async () => {
    if (currentStep === 10) return;
    setCurrentStep(currentStep + 1);
  };

  const isAnyUploading = activeUploads.length > 0;

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in duration-700">
      <div className="mb-8 space-y-4">
        <Progress value={(currentStep / STEPS.length) * 100} className="h-2" />
        <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <span>Step {currentStep} of {STEPS.length}</span>
            <span className="text-primary">{STEPS[currentStep - 1]?.title}</span>
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={e => e.preventDefault()} className="space-y-8">
          {currentStep === 1 && (
              <Card>
                <CardHeader className="pb-3 border-b mb-6">
                    <div className="flex justify-between items-center">
                        <CardTitle>Project Foundation</CardTitle>
                        <FormField control={form.control} name="isSample" render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                                <FormLabel className="text-xs uppercase font-bold">Sample Mode</FormLabel>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {!watchedIsSample && (
                        <FormField control={form.control} name="customerId" render={({ field }) => (
                            <FormItem><FormLabel>Customer</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select a customer" /></SelectTrigger></FormControl>
                                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    )}
                    <FormField control={form.control} name="location.town" render={({ field }) => (
                        <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
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
                            <FormLabel>Color as attached picture</FormLabel>
                            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )} />
                    {!watch(`products.${currentProductIndex}.colorAsAttachment`) && (
                        <FormField control={form.control} name={`products.${currentProductIndex}.colors`} render={({ field }) => (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Wood Finishes</Label>
                                    <div className="grid grid-cols-3 gap-2">{colorSettings?.woodFinishes.map(w => (
                                        <button key={w.name} type="button" onClick={() => field.onChange([w.name])} className={cn("p-1 border rounded-lg overflow-hidden transition-all", field.value?.includes(w.name) ? "border-primary ring-2 ring-primary/20" : "opacity-80 hover:opacity-100")}>
                                            <div className="relative aspect-square rounded-md overflow-hidden"><Image src={w.imageUrl} alt={w.name} fill className="object-cover" /></div>
                                            <span className="text-[10px] font-bold block mt-1 truncate">{w.name}</span>
                                        </button>
                                    ))}</div>
                                </div>
                                <div className="space-y-3"><Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Custom Colors</Label>
                                    <div className="grid grid-cols-4 gap-2">{colorSettings?.customColors.map(c => (
                                        <button key={c.name} type="button" onClick={() => field.onChange([c.name])} className={cn("h-10 rounded-md transition-all", field.value?.includes(c.name) ? "ring-2 ring-primary ring-offset-2 scale-105" : "opacity-80 hover:opacity-100")} style={{ backgroundColor: c.colorValue }} title={c.name} />
                                    ))}</div>
                                </div>
                            </div>
                        )} />
                    )}
                </CardContent>
              </Card>
          )}

          <div className="flex justify-between pt-8 border-t">
              <Button variant="outline" type="button" onClick={() => router.back()}>Cancel</Button>
              <div className="flex gap-2">
                {currentStep > 1 && <Button variant="outline" type="button" onClick={() => setCurrentStep(currentStep - 1)}>Back</Button>}
                {currentStep < 10 ? (
                    <Button type="button" onClick={nextStep}>Next Step <ArrowRight className="ml-2 h-4 w-4" /></Button>
                ) : (
                    <Button type="button" onClick={form.handleSubmit((v) => onSave?.(v as any, !initialOrder))} disabled={isExternallySubmitting || isAnyUploading}>
                        {isExternallySubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} 
                        {submitButtonText}
                    </Button>
                )}
              </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
